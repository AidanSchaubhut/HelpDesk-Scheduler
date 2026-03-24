package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"helpdesk-scheduler/database"
	"helpdesk-scheduler/models"
)

func CreateBadge(w http.ResponseWriter, r *http.Request) {
	var req models.Badge

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid Request Body", http.StatusBadRequest)
		return
	}

	if req.ID == "" || req.Name == "" || req.Icon == "" {
		http.Error(w, "ID, Name and Icon are required", http.StatusBadRequest)
		return
	}

	if err := database.CreateBadge(req); err != nil {
		http.Error(w, "Failed to create Badge", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func GetAllBadges(w http.ResponseWriter, r *http.Request) {
	badges, err := database.GetAllBadges()
	if err != nil {
		http.Error(w, "Failed to fetch badges", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(badges)
}

func GetBadge(w http.ResponseWriter, r *http.Request) {
	badge_id := chi.URLParam(r, "id")
	if badge_id == "" {
		http.Error(w, "id is required", http.StatusBadRequest)
		return
	}

	badge, err := database.GetBadge(badge_id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(badge)
}

func UpdateBadge(w http.ResponseWriter, r *http.Request) {
	badge_id := chi.URLParam(r, "id")
	if badge_id == "" {
		http.Error(w, "id is required", http.StatusBadRequest)
		return
	}

	var req models.UpdateBadgeParams
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid Request Body", http.StatusBadRequest)
		return
	}

	if err := database.UpdateBadge(badge_id, req); err != nil {
		if strings.Contains(err.Error(), "not found") {
			http.Error(w, err.Error(), http.StatusNotFound)
		} else if strings.Contains(err.Error(), "no fields") {
			http.Error(w, err.Error(), http.StatusBadRequest)
		} else {
			http.Error(w, "Failed to update badge", http.StatusInternalServerError)
		}
		return
	}

	w.WriteHeader(http.StatusOK)
}

func DeleteBadge(w http.ResponseWriter, r *http.Request) {
	badge_id := chi.URLParam(r, "id")
	if badge_id == "" {
		http.Error(w, "id is required", http.StatusBadRequest)
		return
	}

	if err := database.DeleteBadge(badge_id); err != nil {
		if strings.Contains(err.Error(), "not found") {
			http.Error(w, err.Error(), http.StatusNotFound)
		} else {
			http.Error(w, "Failed to delete Badge", http.StatusInternalServerError)
		}
		return
	}

	w.WriteHeader(http.StatusOK)
}

func GetAllStudentBadges(w http.ResponseWriter, r *http.Request) {
	results, err := database.GetAllStudentBadges()
	if err != nil {
		http.Error(w, "Failed to fetch student badges", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}

func AssignBadge(w http.ResponseWriter, r *http.Request) {
	badge_id := chi.URLParam(r, "id")
	cwid := chi.URLParam(r, "cwid")

	if badge_id == "" || cwid == "" {
		http.Error(w, "id and cwid are required", http.StatusBadRequest)
		return
	}

	if err := database.AssignBadge(badge_id, cwid); err != nil {
		http.Error(w, "Failed to assign badge to student", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func RevokeBadge(w http.ResponseWriter, r *http.Request) {
	cwid := chi.URLParam(r, "cwid")
	badge_id := chi.URLParam(r, "id")

	if badge_id == "" || cwid == "" {
		http.Error(w, "id and cwid are required", http.StatusBadRequest)
		return
	}

	if err := database.RevokeBadge(badge_id, cwid); err != nil {
		if strings.Contains(err.Error(), "not found") {
			http.Error(w, err.Error(), http.StatusNotFound)
		} else {
			http.Error(w, "Failed to revoke badge from student", http.StatusInternalServerError)
		}
		return
	}
}