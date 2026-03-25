package database

import (
	"helpdesk-scheduler/models"
)

func GetAllTeamHours() ([]models.TeamHours, error) {
	rows, err := DB.Query(
		`SELECT team_id, day, start_time, end_time FROM team_hours ORDER BY team_id, day`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var hours []models.TeamHours
	for rows.Next() {
		var h models.TeamHours
		if err := rows.Scan(&h.TeamID, &h.Day, &h.StartTime, &h.EndTime); err != nil {
			return nil, err
		}
		hours = append(hours, h)
	}
	return hours, rows.Err()
}

func SetTeamHours(teamID string, entries []models.SetTeamHoursParams) error {
	// Delete existing hours for this team, then insert new ones
	_, err := DB.Exec(`DELETE FROM team_hours WHERE team_id = ?`, teamID)
	if err != nil {
		return err
	}

	for _, e := range entries {
		_, err := DB.Exec(
			`INSERT INTO team_hours (team_id, day, start_time, end_time) VALUES (?, ?, ?, ?)`,
			teamID, e.Day, e.StartTime, e.EndTime,
		)
		if err != nil {
			return err
		}
	}
	return nil
}
