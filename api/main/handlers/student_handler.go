package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"golang.org/x/crypto/bcrypt"
	"helpdesk-scheduler/database"
	"helpdesk-scheduler/models"

	"github.com/go-chi/chi/v5"
)

func CreateStudent(w http.ResponseWriter, r *http.Request)  {
	var req models.CreateStudentParams

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid Request Body", http.StatusBadRequest)
		return
	}

	if req.CWID == "" || req.Name == "" || req.User_ID == "" {
		http.Error(w, "CWID, Name, and User_ID are required", http.StatusBadRequest)
		return
	}

	if req.Pin != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(req.Pin), bcrypt.DefaultCost)
		if err != nil {
			http.Error(w, "Failed to hash PIN", http.StatusInternalServerError)
			return
		}
		req.PinHash = string(hash)
	}

	if err := database.CreateStudent(req); err != nil {
		http.Error(w, "Failed to create Student", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func GetAllStudents(w http.ResponseWriter, r *http.Request) {
	students, err := database.GetAllStudents()
	if err != nil {
		http.Error(w, "Failed to fetch students", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(students)
}

func GetStudent(w http.ResponseWriter, r *http.Request) {
	cwid := chi.URLParam(r, "cwid")
	if cwid == "" {
		http.Error(w, "CWID is required", http.StatusBadRequest)
		return
	}

	student, err := database.GetStudent(cwid)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(student)
}

func AssignStudentRole(w http.ResponseWriter, r *http.Request) {
	cwid := chi.URLParam(r, "cwid")
	role := chi.URLParam(r, "role")

	if cwid == "" || role == "" {
		http.Error(w, "CWID and role is required", http.StatusBadRequest)
		return
	}

	if err := database.AssignStudentRole(cwid, role); err != nil {
		if strings.Contains(err.Error(), "not found") {
			http.Error(w, err.Error(), http.StatusNotFound)
		} else {
			http.Error(w, "Failed to assign Student new role", http.StatusInternalServerError)
		}
		return
	}

	w.WriteHeader(http.StatusOK)
}

func SetStudentPin(w http.ResponseWriter, r *http.Request) {
	cwid := chi.URLParam(r, "cwid")
	if cwid == "" {
		http.Error(w, "CWID is required", http.StatusBadRequest)
		return
	}

	var req struct {
		Pin string `json:"pin"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid Request Body", http.StatusBadRequest)
		return
	}

	if req.Pin == "" {
		http.Error(w, "pin is required", http.StatusBadRequest)
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Pin), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Failed to hash PIN", http.StatusInternalServerError)
		return
	}

	if err := database.SetStudentPin(cwid, string(hash)); err != nil {
		if strings.Contains(err.Error(), "not found") {
			http.Error(w, err.Error(), http.StatusNotFound)
		} else {
			http.Error(w, "Failed to set PIN", http.StatusInternalServerError)
		}
		return
	}

	w.WriteHeader(http.StatusOK)
}

func UpdateStudent(w http.ResponseWriter, r *http.Request) {
	cwid := chi.URLParam(r, "cwid")
	if cwid == "" {
		http.Error(w, "CWID is required", http.StatusBadRequest)
		return
	}

	var req models.UpdateStudentParams
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid Request Body", http.StatusBadRequest)
		return
	}

	if req.Name == "" || req.User_ID == "" {
		http.Error(w, "Name and User ID are required", http.StatusBadRequest)
		return
	}

	if err := database.UpdateStudent(cwid, req); err != nil {
		if strings.Contains(err.Error(), "not found") {
			http.Error(w, err.Error(), http.StatusNotFound)
		} else {
			http.Error(w, "Failed to update student", http.StatusInternalServerError)
		}
		return
	}

	w.WriteHeader(http.StatusOK)
}

func DeleteStudent(w http.ResponseWriter, r *http.Request) {
	cwid := chi.URLParam(r, "cwid")
	if cwid == "" {
		http.Error(w, "CWID is required", http.StatusBadRequest)
		return
	}

	if err := database.DeleteStudent(cwid); err != nil {
		if strings.Contains(err.Error(), "not found") {
			http.Error(w, err.Error(), http.StatusNotFound)
		} else {
			http.Error(w, "Failed to delete Student", http.StatusInternalServerError)
		}
		return
	}

	w.WriteHeader(http.StatusOK)
}