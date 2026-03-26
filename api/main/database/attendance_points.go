package database

import (
	"database/sql"

	"helpdesk-scheduler/models"
)

func DisciplineLevel(points float64) string {
	switch {
	case points >= 10:
		return "Termination"
	case points >= 7:
		return "Final Warning"
	case points >= 5:
		return "Written Warning"
	case points >= 3:
		return "Verbal Reminder"
	default:
		return "Good Standing"
	}
}

func CreateAttendancePoint(params models.CreateAttendancePointParams, givenBy string) (int64, error) {
	result, err := DB.Exec(
		"INSERT INTO attendance_points (cwid, points, reason, given_by) VALUES (?, ?, ?, ?)",
		params.CWID, params.Points, params.Reason, givenBy,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

func GetPointsByStudent(cwid string) ([]models.AttendancePoint, float64, error) {
	rows, err := DB.Query(`
		SELECT id, cwid, points, reason, given_by, created_at
		FROM attendance_points
		WHERE cwid = ?
		ORDER BY created_at DESC
	`, cwid)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var history []models.AttendancePoint
	var total float64
	for rows.Next() {
		var p models.AttendancePoint
		if err := rows.Scan(&p.ID, &p.CWID, &p.Points, &p.Reason, &p.GivenBy, &p.CreatedAt); err != nil {
			return nil, 0, err
		}
		total += p.Points
		history = append(history, p)
	}
	return history, total, rows.Err()
}

func GetAllPointsSummary() ([]models.StudentPointsSummary, error) {
	rows, err := DB.Query(`
		SELECT s.cwid, s.name, COALESCE(SUM(a.points), 0) as total_points
		FROM students s
		LEFT JOIN attendance_points a ON s.cwid = a.cwid
		GROUP BY s.cwid, s.name
		ORDER BY total_points DESC, s.name
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var summaries []models.StudentPointsSummary
	for rows.Next() {
		var s models.StudentPointsSummary
		if err := rows.Scan(&s.CWID, &s.StudentName, &s.TotalPoints); err != nil {
			return nil, err
		}
		s.DisciplineLevel = DisciplineLevel(s.TotalPoints)
		summaries = append(summaries, s)
	}
	return summaries, rows.Err()
}

func GetAllAttendancePoints() ([]models.AttendancePointDetail, error) {
	rows, err := DB.Query(`
		SELECT a.id, a.cwid, s.name, a.points, a.reason, a.given_by, g.name, a.created_at
		FROM attendance_points a
		JOIN students s ON a.cwid = s.cwid
		LEFT JOIN students g ON a.given_by = g.cwid
		ORDER BY a.created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var points []models.AttendancePointDetail
	for rows.Next() {
		var p models.AttendancePointDetail
		var givenByName sql.NullString
		if err := rows.Scan(&p.ID, &p.CWID, &p.StudentName, &p.Points, &p.Reason, &p.GivenBy, &givenByName, &p.CreatedAt); err != nil {
			return nil, err
		}
		if givenByName.Valid {
			p.GivenByName = &givenByName.String
		}
		points = append(points, p)
	}
	return points, rows.Err()
}

func DeleteAllAttendancePoints() (int64, error) {
	result, err := DB.Exec("DELETE FROM attendance_points")
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}
