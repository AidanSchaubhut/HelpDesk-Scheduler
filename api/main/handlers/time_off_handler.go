package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"helpdesk-scheduler/database"
	"helpdesk-scheduler/models"
)

func CreateTimeOffRequest(w http.ResponseWriter, r *http.Request) {
	var req models.CreateTimeOffParams

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid Request Body", http.StatusBadRequest)
		return
	}

	if req.CWID == "" || req.Day == "" {
		http.Error(w, "cwid and day are required", http.StatusBadRequest)
		return
	}

	if req.Reason == nil || *req.Reason == "" {
		http.Error(w, "reason is required", http.StatusBadRequest)
		return
	}

	id, err := database.CreateTimeOffRequest(req)
	if err != nil {
		http.Error(w, "Failed to create time off request", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]int64{"id": id})
}

func GetTimeOffByStudent(w http.ResponseWriter, r *http.Request) {
	cwid := chi.URLParam(r, "cwid")
	if cwid == "" {
		http.Error(w, "cwid is required", http.StatusBadRequest)
		return
	}

	requests, err := database.GetTimeOffByStudent(cwid)
	if err != nil {
		http.Error(w, "Failed to fetch time off requests", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests)
}

func GetTimeOffByDay(w http.ResponseWriter, r *http.Request) {
	day := chi.URLParam(r, "day")
	if day == "" {
		http.Error(w, "day is required", http.StatusBadRequest)
		return
	}

	requests, err := database.GetTimeOffByDay(day)
	if err != nil {
		http.Error(w, "Failed to fetch time off requests", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests)
}

func GetAllTimeOffRequests(w http.ResponseWriter, r *http.Request) {
	requests, err := database.GetAllTimeOffRequests()
	if err != nil {
		http.Error(w, "Failed to fetch time off requests", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests)
}

func AdminDeleteTimeOffRequest(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	if idStr == "" {
		http.Error(w, "id is required", http.StatusBadRequest)
		return
	}

	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "id must be a number", http.StatusBadRequest)
		return
	}

	result, err := database.DB.Exec("DELETE FROM time_off_requests WHERE id = ?", id)
	if err != nil {
		http.Error(w, "Failed to delete time off request", http.StatusInternalServerError)
		return
	}

	rows, err := result.RowsAffected()
	if err != nil {
		http.Error(w, "Failed to delete time off request", http.StatusInternalServerError)
		return
	}
	if rows == 0 {
		http.Error(w, "time off request not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func DeleteTimeOffRequest(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	cwid := chi.URLParam(r, "cwid")

	if idStr == "" || cwid == "" {
		http.Error(w, "id and cwid are required", http.StatusBadRequest)
		return
	}

	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "id must be a number", http.StatusBadRequest)
		return
	}

	if err := database.DeleteTimeOffRequest(id, cwid); err != nil {
		if strings.Contains(err.Error(), "not found") {
			http.Error(w, err.Error(), http.StatusNotFound)
		} else {
			http.Error(w, "Failed to delete time off request", http.StatusInternalServerError)
		}
		return
	}

	w.WriteHeader(http.StatusOK)
}
