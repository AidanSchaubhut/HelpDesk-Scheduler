package database

import (
	"fmt"
	"helpdesk-scheduler/models"
)

func CreateTimeclockRequest(params models.CreateTimeclockParams) (int64, error) {
	result, err := DB.Exec(
		`INSERT INTO timeclock_requests (cwid, shift_date, start_time, end_time, reason)
		 VALUES (?, ?, ?, ?, ?)`,
		params.CWID, params.ShiftDate, params.StartTime, params.EndTime, params.Reason,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

func GetTimeclockByStudent(cwid string) ([]models.TimeclockRequest, error) {
	rows, err := DB.Query(
		`SELECT id, cwid, shift_date, start_time, end_time, reason, status,
		        COALESCE(admin_notes, ''), COALESCE(resolved_by, ''), COALESCE(resolved_at, ''), created_at
		 FROM timeclock_requests
		 WHERE cwid = ?
		 ORDER BY created_at DESC`,
		cwid,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var requests []models.TimeclockRequest
	for rows.Next() {
		var r models.TimeclockRequest
		if err := rows.Scan(&r.ID, &r.CWID, &r.ShiftDate, &r.StartTime, &r.EndTime,
			&r.Reason, &r.Status, &r.AdminNotes, &r.ResolvedBy, &r.ResolvedAt, &r.CreatedAt); err != nil {
			return nil, err
		}
		requests = append(requests, r)
	}
	return requests, rows.Err()
}

func GetAllTimeclockRequests() ([]models.TimeclockRequestDetail, error) {
	rows, err := DB.Query(
		`SELECT t.id, t.cwid, t.shift_date, t.start_time, t.end_time, t.reason, t.status,
		        COALESCE(t.admin_notes, ''), COALESCE(t.resolved_by, ''), COALESCE(t.resolved_at, ''), t.created_at,
		        COALESCE(s.name, '') as student_name
		 FROM timeclock_requests t
		 LEFT JOIN students s ON t.cwid = s.cwid
		 ORDER BY CASE WHEN t.status = 'pending' THEN 0 ELSE 1 END, t.created_at DESC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var requests []models.TimeclockRequestDetail
	for rows.Next() {
		var r models.TimeclockRequestDetail
		if err := rows.Scan(&r.ID, &r.CWID, &r.ShiftDate, &r.StartTime, &r.EndTime,
			&r.Reason, &r.Status, &r.AdminNotes, &r.ResolvedBy, &r.ResolvedAt, &r.CreatedAt,
			&r.StudentName); err != nil {
			return nil, err
		}
		requests = append(requests, r)
	}
	return requests, rows.Err()
}

func ResolveTimeclockRequest(id int64, adminCWID string, notes string) error {
	result, err := DB.Exec(
		`UPDATE timeclock_requests
		 SET status = 'fixed', admin_notes = ?, resolved_by = ?, resolved_at = datetime('now')
		 WHERE id = ? AND status = 'pending'`,
		notes, adminCWID, id,
	)
	if err != nil {
		return err
	}
	n, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return fmt.Errorf("request not found or already resolved")
	}
	return nil
}
