package database

import (
	"database/sql"
	"fmt"

	"helpdesk-scheduler/models"
)

func CreateTimeOffRequest(params models.CreateTimeOffParams) (int64, error) {
	result, err := DB.Exec("INSERT INTO time_off_requests (cwid, day, slot, effective_date, reason) VALUES (?, ?, ?, ?, ?)",
		params.CWID, params.Day, params.Slot, params.EffectiveDate, params.Reason)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

func GetTimeOffByStudent(cwid string) ([]models.TimeOffRequest, error) {
	rows, err := DB.Query(`
		SELECT id, cwid, day, COALESCE(slot, ''), COALESCE(effective_date, ''), COALESCE(reason, ''), status, reviewed_by, reviewed_at, created_at
		FROM time_off_requests
		WHERE cwid = ?
		ORDER BY effective_date IS NULL, effective_date, day, slot
	`, cwid)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var requests []models.TimeOffRequest
	for rows.Next() {
		var r models.TimeOffRequest
		if err := rows.Scan(&r.ID, &r.CWID, &r.Day, &r.Slot, &r.EffectiveDate, &r.Reason, &r.Status, &r.ReviewedBy, &r.ReviewedAt, &r.CreatedAt); err != nil {
			return nil, err
		}
		requests = append(requests, r)
	}
	return requests, rows.Err()
}

func GetTimeOffByDay(day string) ([]models.TimeOffRequest, error) {
	// Return recurring requests (no date) and date-specific requests only if effective_date = today
	rows, err := DB.Query(`
		SELECT id, cwid, day, COALESCE(slot, ''), COALESCE(effective_date, ''), COALESCE(reason, ''), status, reviewed_by, reviewed_at, created_at
		FROM time_off_requests
		WHERE day = ? AND (effective_date IS NULL OR effective_date = date('now'))
		ORDER BY slot
	`, day)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var requests []models.TimeOffRequest
	for rows.Next() {
		var r models.TimeOffRequest
		if err := rows.Scan(&r.ID, &r.CWID, &r.Day, &r.Slot, &r.EffectiveDate, &r.Reason, &r.Status, &r.ReviewedBy, &r.ReviewedAt, &r.CreatedAt); err != nil {
			return nil, err
		}
		requests = append(requests, r)
	}
	return requests, rows.Err()
}

func GetAllTimeOffRequests() ([]models.TimeOffRequestDetail, error) {
	rows, err := DB.Query(`
		SELECT t.id, t.cwid, s.name, t.day, COALESCE(t.slot, ''), COALESCE(t.effective_date, ''), COALESCE(t.reason, ''), t.status, t.reviewed_by, t.reviewed_at, t.created_at
		FROM time_off_requests t
		JOIN students s ON t.cwid = s.cwid
		ORDER BY t.effective_date IS NULL, t.effective_date, t.day, t.cwid, t.slot
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var requests []models.TimeOffRequestDetail
	for rows.Next() {
		var r models.TimeOffRequestDetail
		if err := rows.Scan(&r.ID, &r.CWID, &r.StudentName, &r.Day, &r.Slot, &r.EffectiveDate, &r.Reason, &r.Status, &r.ReviewedBy, &r.ReviewedAt, &r.CreatedAt); err != nil {
			return nil, err
		}
		requests = append(requests, r)
	}
	return requests, rows.Err()
}

func DeleteTimeOffRequest(id int, cwid string) error {
	result, err := DB.Exec("DELETE FROM time_off_requests WHERE id = ? AND cwid = ?", id, cwid)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("time off request not found")
	}

	return nil
}

func UpdateTimeOffStatus(id int, status string, reviewedBy string) error {
	_, err := DB.Exec(`
		UPDATE time_off_requests
		SET status = ?, reviewed_by = ?, reviewed_at = datetime('now')
		WHERE id = ?
	`, status, reviewedBy, id)
	return err
}

func GetAbsenceCountsByStudent(cwid string) (excused, unexcused, pending, total int, err error) {
	row := DB.QueryRow(`
		SELECT
			COUNT(*) as total,
			SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excused,
			SUM(CASE WHEN status = 'unexcused' THEN 1 ELSE 0 END) as unexcused,
			SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
		FROM (
			SELECT cwid, day, COALESCE(effective_date, ''), COALESCE(reason, ''), status
			FROM time_off_requests
			WHERE cwid = ?
			GROUP BY cwid, day, COALESCE(effective_date, ''), COALESCE(reason, '')
		)
	`, cwid)

	var totalCount, excusedCount, unexcusedCount, pendingCount sql.NullInt64
	if scanErr := row.Scan(&totalCount, &excusedCount, &unexcusedCount, &pendingCount); scanErr != nil {
		return 0, 0, 0, 0, scanErr
	}

	excused = int(excusedCount.Int64)
	unexcused = int(unexcusedCount.Int64)
	pending = int(pendingCount.Int64)
	total = int(totalCount.Int64)
	return
}

func GetTimeOffCWID(id int) (cwid, day, effectiveDate string, err error) {
	err = DB.QueryRow("SELECT cwid, day, COALESCE(effective_date, '') FROM time_off_requests WHERE id = ?", id).Scan(&cwid, &day, &effectiveDate)
	return
}

func GetAllAbsenceCounts() ([]models.StudentAbsenceCount, error) {
	rows, err := DB.Query(`
		SELECT s.cwid, s.name,
			COUNT(g.cwid) as total,
			SUM(CASE WHEN g.status = 'excused' THEN 1 ELSE 0 END) as excused,
			SUM(CASE WHEN g.status = 'unexcused' THEN 1 ELSE 0 END) as unexcused,
			SUM(CASE WHEN g.status = 'pending' THEN 1 ELSE 0 END) as pending
		FROM students s
		LEFT JOIN (
			SELECT cwid, day, COALESCE(effective_date, '') as ed, COALESCE(reason, '') as r, status
			FROM time_off_requests
			GROUP BY cwid, day, COALESCE(effective_date, ''), COALESCE(reason, '')
		) g ON s.cwid = g.cwid
		GROUP BY s.cwid, s.name
		ORDER BY s.cwid
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var counts []models.StudentAbsenceCount
	for rows.Next() {
		var c models.StudentAbsenceCount
		var excused, unexcused, pending, total sql.NullInt64
		if err := rows.Scan(&c.CWID, &c.StudentName, &total, &excused, &unexcused, &pending); err != nil {
			return nil, err
		}
		c.Excused = int(excused.Int64)
		c.Unexcused = int(unexcused.Int64)
		c.Pending = int(pending.Int64)
		c.Total = int(total.Int64)
		counts = append(counts, c)
	}
	return counts, rows.Err()
}
