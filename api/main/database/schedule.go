package database

import (
	"fmt"

	"helpdesk-scheduler/models"
)

func SignUpForSlot(cwid string, team_id string, day string, slot string) error {
	locked, err := GetScheduleLock()
	if err != nil {
		return err
	}
	if locked {
		return fmt.Errorf("schedule is locked")
	}

	var exists bool
	err = DB.QueryRow("SELECT EXISTS(SELECT 1 FROM assignments WHERE cwid = ? AND team_id = ?)", cwid, team_id).Scan(&exists)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("student %s is not assigned to team %s", cwid, team_id)
	}

	var count int
	var maxPerSlot int
	err = DB.QueryRow("SELECT COUNT(*) FROM schedule WHERE day = ? AND slot = ? AND team_id = ?", day, slot, team_id).Scan(&count)
	if err != nil {
		return err
	}
	err = DB.QueryRow("SELECT max_per_slot FROM teams WHERE id = ?", team_id).Scan(&maxPerSlot)
	if err != nil {
		return err
	}
	if count >= maxPerSlot {
		return fmt.Errorf("slot is full")
	}

	_, err = DB.Exec("INSERT INTO schedule (cwid, team_id, day, slot) VALUES (?, ?, ?, ?)", cwid, team_id, day, slot)
	return err
}

func RemoveFromSlot(cwid string, team_id string, day string, slot string) error {
	locked, err := GetScheduleLock()
	if err != nil {
		return err
	}
	if locked {
		return fmt.Errorf("schedule is locked")
	}

	result, err := DB.Exec("DELETE FROM schedule WHERE cwid = ? AND team_id = ? AND day = ? AND slot = ?", cwid, team_id, day, slot)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("schedule entry not found")
	}

	return nil
}

func GetScheduleByDay(day string) ([]models.ScheduleEntry, error) {
	rows, err := DB.Query(`
		SELECT s.cwid, s.team_id, s.day, s.slot, st.name
		FROM schedule s
		JOIN students st ON s.cwid = st.cwid
		WHERE s.day = ?
		ORDER BY s.slot, s.team_id
	`, day)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []models.ScheduleEntry
	for rows.Next() {
		var e models.ScheduleEntry
		if err := rows.Scan(&e.CWID, &e.TeamID, &e.Day, &e.Slot, &e.StudentName); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, rows.Err()
}

func GetScheduleByStudent(cwid string, day string) ([]models.ScheduleEntry, error) {
	rows, err := DB.Query(`
		SELECT s.cwid, s.team_id, s.day, s.slot, st.name
		FROM schedule s
		JOIN students st ON s.cwid = st.cwid
		WHERE s.cwid = ? AND s.day = ?
		ORDER BY s.slot
	`, cwid, day)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []models.ScheduleEntry
	for rows.Next() {
		var e models.ScheduleEntry
		if err := rows.Scan(&e.CWID, &e.TeamID, &e.Day, &e.Slot, &e.StudentName); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, rows.Err()
}

// ScheduledStudent represents a student with an active shift on a given day.
type ScheduledStudent struct {
	CWID   string
	UserID string
	TeamID string
}

// GetScheduledStudentsByDay returns distinct (cwid, user_id, team_id) pairs for a given day.
func GetScheduledStudentsByDay(day string) ([]ScheduledStudent, error) {
	rows, err := DB.Query(`
		SELECT DISTINCT s.cwid, st.user_id, s.team_id
		FROM schedule s
		JOIN students st ON s.cwid = st.cwid
		WHERE s.day = ?
	`, day)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []ScheduledStudent
	for rows.Next() {
		var ss ScheduledStudent
		if err := rows.Scan(&ss.CWID, &ss.UserID, &ss.TeamID); err != nil {
			return nil, err
		}
		result = append(result, ss)
	}
	return result, rows.Err()
}

func GetAllStudentSlotCounts() (map[string]int, error) {
	rows, err := DB.Query("SELECT cwid, COUNT(*) FROM schedule GROUP BY cwid")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	counts := make(map[string]int)
	for rows.Next() {
		var cwid string
		var count int
		if err := rows.Scan(&cwid, &count); err != nil {
			return nil, err
		}
		counts[cwid] = count
	}
	return counts, rows.Err()
}

func ClearAllSchedule() (int64, error) {
	result, err := DB.Exec("DELETE FROM schedule")
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}

func AutofillFromDay(cwid string, sourceDay string, targetDay string) (models.AutofillResult, error) {
	result := models.AutofillResult{}

	locked, err := GetScheduleLock()
	if err != nil {
		return result, err
	}
	if locked {
		return result, fmt.Errorf("schedule is locked")
	}

	// Get all of this student's shifts on the source day
	rows, err := DB.Query("SELECT team_id, slot FROM schedule WHERE cwid = ? AND day = ?", cwid, sourceDay)
	if err != nil {
		return result, err
	}
	defer rows.Close()

	type shift struct {
		teamID string
		slot   string
	}
	var shifts []shift
	for rows.Next() {
		var s shift
		if err := rows.Scan(&s.teamID, &s.slot); err != nil {
			return result, err
		}
		shifts = append(shifts, s)
	}
	if err := rows.Err(); err != nil {
		return result, err
	}

	for _, s := range shifts {
		// Check if already signed up on target day
		var exists bool
		err := DB.QueryRow("SELECT EXISTS(SELECT 1 FROM schedule WHERE cwid = ? AND team_id = ? AND day = ? AND slot = ?)",
			cwid, s.teamID, targetDay, s.slot).Scan(&exists)
		if err != nil {
			return result, err
		}
		if exists {
			continue
		}

		// Check capacity
		var count int
		var maxPerSlot int
		err = DB.QueryRow("SELECT COUNT(*) FROM schedule WHERE day = ? AND slot = ? AND team_id = ?",
			targetDay, s.slot, s.teamID).Scan(&count)
		if err != nil {
			return result, err
		}
		err = DB.QueryRow("SELECT max_per_slot FROM teams WHERE id = ?", s.teamID).Scan(&maxPerSlot)
		if err != nil {
			return result, err
		}

		if count >= maxPerSlot {
			result.Skipped++
			continue
		}

		_, err = DB.Exec("INSERT INTO schedule (cwid, team_id, day, slot) VALUES (?, ?, ?, ?)",
			cwid, s.teamID, targetDay, s.slot)
		if err != nil {
			return result, err
		}
		result.Added++
	}

	return result, nil
}