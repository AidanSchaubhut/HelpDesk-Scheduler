package database

import (
	"database/sql"
	"fmt"
	"helpdesk-scheduler/models"
	"log/slog"
)


func CreateStudent(params models.CreateStudentParams) error {
	const q = `
		INSERT INTO students ("cwid", "name", "user_id")
		VALUES (?, ?, ?)
	`

	if DB == nil {
		return sql.ErrConnDone
	}

	_, err := DB.Exec(q, params.CWID, params.Name, params.User_ID)
	if err != nil {
		slog.Error("failed to create user", err)
	}
	return err
}

func GetAllStudents() ([]models.Student, error) {
	rows, err := DB.Query("SELECT cwid, user_id, name, role FROM students")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var students []models.Student
	for rows.Next() {
		var s models.Student
		if err := rows.Scan(&s.CWID, &s.User_ID, &s.Name, &s.Role); err != nil {
			return nil, err
		}
		students = append(students, s)
	}
	return students, rows.Err()
}

func GetStudent(cwid string) (models.Student, error) {
	var s models.Student
	err := DB.QueryRow("SELECT cwid, user_id, name, role FROM students WHERE cwid = ?", cwid).Scan(&s.CWID, &s.User_ID, &s.Name, &s.Role)
	if err != nil {
		return s, fmt.Errorf("student %s not found", cwid)
	}
	return s, nil
}

func DeleteStudent(cwid string) error {
	result, err := DB.Exec("DELETE from students WHERE cwid = ?", cwid)
	if err != nil {
		slog.Error("failed to delete user")
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("student %s not found", cwid)
	}

	return nil
}

func AssignStudentRole(cwid string, role string) error {
	result, err := DB.Exec("UPDATE students SET role = ? WHERE cwid = ?", role, cwid)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("student %s not found", cwid)
	}

	return nil
}

