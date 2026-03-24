package database

import (
	"database/sql"
	"fmt"
	"strings"

	"helpdesk-scheduler/models"
	"log/slog"
)

func CreateTeam(params models.CreateTeamParams) error {
	const q = `
		INSERT INTO teams ("id", "name", "color")
		VALUES (?, ?, ?)
	`

	if DB == nil {
		return sql.ErrConnDone
	}

	_, err := DB.Exec(q, params.ID, params.Name, params.Color)
	if err != nil {
		slog.Error("failed to create team", err)
	}
	return err
}

func GetAllTeams() ([]models.Team, error) {
	rows, err := DB.Query("SELECT id, name, color, max_per_slot, COALESCE(kace_queue_user, '') FROM teams")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var teams []models.Team
	for rows.Next() {
		var t models.Team
		if err := rows.Scan(&t.ID, &t.Name, &t.Color, &t.Max_per_slot, &t.KaceQueueUser); err != nil {
			return nil, err
		}
		teams = append(teams, t)
	}
	return teams, rows.Err()
}

func GetTeam(team_id string) (models.Team, error) {
	var t models.Team
	err := DB.QueryRow("SELECT id, name, color, max_per_slot, COALESCE(kace_queue_user, '') FROM teams WHERE id = ?", team_id).Scan(&t.ID, &t.Name, &t.Color, &t.Max_per_slot, &t.KaceQueueUser)
	if err != nil {
		return t, fmt.Errorf("team %s not found", team_id)
	}
	return t, nil
}

func UpdateTeam(team_id string, params models.UpdateTeamParams) error {
	// Build query dynamically based on which fields are provided
	setClauses := []string{}
	args := []interface{}{}

	if params.Name != nil {
		setClauses = append(setClauses, "name = ?")
		args = append(args, *params.Name)
	}
	if params.Color != nil {
		setClauses = append(setClauses, "color = ?")
		args = append(args, *params.Color)
	}
	if params.Max_per_slot != nil {
		setClauses = append(setClauses, "max_per_slot = ?")
		args = append(args, *params.Max_per_slot)
	}
	if params.KaceQueueUser != nil {
		setClauses = append(setClauses, "kace_queue_user = ?")
		args = append(args, *params.KaceQueueUser)
	}

	if len(setClauses) == 0 {
		return fmt.Errorf("no fields to update")
	}

	q := "UPDATE teams SET " + strings.Join(setClauses, ", ") + " WHERE id = ?"
	args = append(args, team_id)

	result, err := DB.Exec(q, args...)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("team %s not found", team_id)
	}

	return nil
}

func DeleteTeam(team_id string) error {
	result, err := DB.Exec("DELETE from teams WHERE id = ?", team_id)
	if err != nil {
		slog.Error("failed to delete team")
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("team %s not found", team_id)
	}

	return nil
}

