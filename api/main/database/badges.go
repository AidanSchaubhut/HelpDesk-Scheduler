package database

import (
	"database/sql"
	"fmt"
	"strings"

	"helpdesk-scheduler/models"
	"log/slog"
)

func CreateBadge(params models.Badge) error {
	const q = `
		INSERT INTO badges ("id", "name", "icon")
		VALUES (?, ?, ?)
	`

	if DB == nil {
		return sql.ErrConnDone
	}

	_, err := DB.Exec(q, params.ID, params.Name, params.Icon)
	if err != nil {
		slog.Error("failed to create Badge", err)
	}
	return err
}

func GetAllBadges() ([]models.Badge, error) {
	rows, err := DB.Query("SELECT id, name, icon FROM badges")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var badges []models.Badge
	for rows.Next() {
		var b models.Badge
		if err := rows.Scan(&b.ID, &b.Name, &b.Icon); err != nil {
			return nil, err
		}
		badges = append(badges, b)
	}
	return badges, rows.Err()
}

func GetBadge(badge_id string) (models.Badge, error) {
	var b models.Badge
	err := DB.QueryRow("SELECT id, name, icon FROM badges WHERE id = ?", badge_id).Scan(&b.ID, &b.Name, &b.Icon)
	if err != nil {
		return b, fmt.Errorf("badge %s not found", badge_id)
	}
	return b, nil
}

func UpdateBadge(badge_id string, params models.UpdateBadgeParams) error {
	setClauses := []string{}
	args := []interface{}{}

	if params.Name != nil {
		setClauses = append(setClauses, "name = ?")
		args = append(args, *params.Name)
	}
	if params.Icon != nil {
		setClauses = append(setClauses, "icon = ?")
		args = append(args, *params.Icon)
	}

	if len(setClauses) == 0 {
		return fmt.Errorf("no fields to update")
	}

	q := "UPDATE badges SET " + strings.Join(setClauses, ", ") + " WHERE id = ?"
	args = append(args, badge_id)

	result, err := DB.Exec(q, args...)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("badge %s not found", badge_id)
	}

	return nil
}

func DeleteBadge(badge_id string) error {
	result, err := DB.Exec("DELETE from badges WHERE id = ?", badge_id)
	if err != nil {
		slog.Error("failed to delete badge")
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("badge %s not found", badge_id)
	}

	return nil
}

func GetAllStudentBadges() ([]models.StudentBadgeDetail, error) {
	rows, err := DB.Query(`
		SELECT sb.cwid, sb.badge_id, b.name, b.icon
		FROM student_badges sb
		JOIN badges b ON sb.badge_id = b.id
		ORDER BY sb.cwid, sb.badge_id
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []models.StudentBadgeDetail
	for rows.Next() {
		var r models.StudentBadgeDetail
		if err := rows.Scan(&r.CWID, &r.BadgeID, &r.BadgeName, &r.BadgeIcon); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, rows.Err()
}

func AssignBadge(badge_id string, cwid string) error {
	_, err := DB.Exec("INSERT INTO student_badges (cwid, badge_id) VALUES (?, ?)", cwid, badge_id)
	return err
}

func RevokeBadge(badge_id string, cwid string) error {
	result, err := DB.Exec("DELETE FROM student_badges WHERE cwid = ? AND badge_id = ?", cwid, badge_id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("student: %s does not have badge %s", cwid, badge_id)
	}

	return nil
}