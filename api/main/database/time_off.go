package database

import (
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
		SELECT id, cwid, day, COALESCE(slot, ''), COALESCE(effective_date, ''), COALESCE(reason, ''), created_at
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
		if err := rows.Scan(&r.ID, &r.CWID, &r.Day, &r.Slot, &r.EffectiveDate, &r.Reason, &r.CreatedAt); err != nil {
			return nil, err
		}
		requests = append(requests, r)
	}
	return requests, rows.Err()
}

func GetTimeOffByDay(day string) ([]models.TimeOffRequest, error) {
	// Return recurring requests (no date) and date-specific requests only if effective_date = today
	rows, err := DB.Query(`
		SELECT id, cwid, day, COALESCE(slot, ''), COALESCE(effective_date, ''), COALESCE(reason, ''), created_at
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
		if err := rows.Scan(&r.ID, &r.CWID, &r.Day, &r.Slot, &r.EffectiveDate, &r.Reason, &r.CreatedAt); err != nil {
			return nil, err
		}
		requests = append(requests, r)
	}
	return requests, rows.Err()
}

func GetAllTimeOffRequests() ([]models.TimeOffRequestDetail, error) {
	rows, err := DB.Query(`
		SELECT t.id, t.cwid, s.name, t.day, COALESCE(t.slot, ''), COALESCE(t.effective_date, ''), COALESCE(t.reason, ''), t.created_at
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
		if err := rows.Scan(&r.ID, &r.CWID, &r.StudentName, &r.Day, &r.Slot, &r.EffectiveDate, &r.Reason, &r.CreatedAt); err != nil {
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
