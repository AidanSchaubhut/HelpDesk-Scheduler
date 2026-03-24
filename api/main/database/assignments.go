package database

import (
	"fmt"

	"helpdesk-scheduler/models"
)

func AssignStudent(cwid string, team_id string) error {
	_, err := DB.Exec("INSERT INTO assignments (cwid, team_id) VALUES (?, ?)", cwid, team_id)
	return err
}

// Unassign removes student from team and cascades to delete their schedule entries for that team
func UnassignStudent(cwid string, team_id string) error {
	result, err := DB.Exec("DELETE FROM assignments WHERE cwid = ? AND team_id = ?", cwid, team_id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("assignment not found for student %s on team %s", cwid, team_id)
	}

	return nil
}

func GetAssignmentsByStudent(cwid string) ([]models.Assignment, error) {
	rows, err := DB.Query("SELECT cwid, team_id FROM assignments WHERE cwid = ?", cwid)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var assignments []models.Assignment
	for rows.Next() {
		var a models.Assignment
		if err := rows.Scan(&a.CWID, &a.TeamID); err != nil {
			return nil, err
		}
		assignments = append(assignments, a)
	}
	return assignments, rows.Err()
}

func GetAssignmentsByTeam(team_id string) ([]models.Assignment, error) {
	rows, err := DB.Query("SELECT cwid, team_id FROM assignments WHERE team_id = ?", team_id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var assignments []models.Assignment
	for rows.Next() {
		var a models.Assignment
		if err := rows.Scan(&a.CWID, &a.TeamID); err != nil {
			return nil, err
		}
		assignments = append(assignments, a)
	}
	return assignments, rows.Err()
}

func GetAllAssignments() ([]models.Assignment, error) {
	rows, err := DB.Query("SELECT cwid, team_id FROM assignments")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var assignments []models.Assignment
	for rows.Next() {
		var a models.Assignment
		if err := rows.Scan(&a.CWID, &a.TeamID); err != nil {
			return nil, err
		}
		assignments = append(assignments, a)
	}
	return assignments, rows.Err()
}
