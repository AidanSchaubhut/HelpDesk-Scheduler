package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"helpdesk-scheduler/database"
)

func SignUpForSlot(w http.ResponseWriter, r *http.Request) {
	var req struct {
		CWID   string `json:"cwid"`
		TeamID string `json:"team_id"`
		Day    string `json:"day"`
		Slot   string `json:"slot"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid Request Body", http.StatusBadRequest)
		return
	}

	if req.CWID == "" || req.TeamID == "" || req.Day == "" || req.Slot == "" {
		http.Error(w, "cwid, team_id, day, and slot are required", http.StatusBadRequest)
		return
	}

	if err := database.SignUpForSlot(req.CWID, req.TeamID, req.Day, req.Slot); err != nil {
		if strings.Contains(err.Error(), "locked") {
			http.Error(w, err.Error(), http.StatusForbidden)
		} else if strings.Contains(err.Error(), "not assigned") {
			http.Error(w, err.Error(), http.StatusForbidden)
		} else if strings.Contains(err.Error(), "full") {
			http.Error(w, err.Error(), http.StatusConflict)
		} else {
			http.Error(w, "Failed to sign up for slot", http.StatusInternalServerError)
		}
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func RemoveFromSlot(w http.ResponseWriter, r *http.Request) {
	var req struct {
		CWID   string `json:"cwid"`
		TeamID string `json:"team_id"`
		Day    string `json:"day"`
		Slot   string `json:"slot"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid Request Body", http.StatusBadRequest)
		return
	}

	if req.CWID == "" || req.TeamID == "" || req.Day == "" || req.Slot == "" {
		http.Error(w, "cwid, team_id, day, and slot are required", http.StatusBadRequest)
		return
	}

	if err := database.RemoveFromSlot(req.CWID, req.TeamID, req.Day, req.Slot); err != nil {
		if strings.Contains(err.Error(), "locked") {
			http.Error(w, err.Error(), http.StatusForbidden)
		} else if strings.Contains(err.Error(), "not found") {
			http.Error(w, err.Error(), http.StatusNotFound)
		} else {
			http.Error(w, "Failed to remove from slot", http.StatusInternalServerError)
		}
		return
	}

	w.WriteHeader(http.StatusOK)
}

func GetScheduleByDay(w http.ResponseWriter, r *http.Request) {
	day := chi.URLParam(r, "day")
	if day == "" {
		http.Error(w, "day is required", http.StatusBadRequest)
		return
	}

	entries, err := database.GetScheduleByDay(day)
	if err != nil {
		http.Error(w, "Failed to fetch schedule", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(entries)
}

func GetScheduleByStudent(w http.ResponseWriter, r *http.Request) {
	cwid := chi.URLParam(r, "cwid")
	day := chi.URLParam(r, "day")
	if cwid == "" || day == "" {
		http.Error(w, "cwid and day are required", http.StatusBadRequest)
		return
	}

	entries, err := database.GetScheduleByStudent(cwid, day)
	if err != nil {
		http.Error(w, "Failed to fetch schedule", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(entries)
}

func ClearAllSchedule(w http.ResponseWriter, r *http.Request) {
	deleted, err := database.ClearAllSchedule()
	if err != nil {
		http.Error(w, "Failed to clear schedule", http.StatusInternalServerError)
		return
	}

	// Also reset time-off requests and attendance points (quarterly reset)
	database.DB.Exec("DELETE FROM time_off_requests")
	database.DeleteAllAttendancePoints()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]int64{"deleted": deleted})
}

func AutofillFromDay(w http.ResponseWriter, r *http.Request) {
	var req struct {
		CWID      string `json:"cwid"`
		SourceDay string `json:"source_day"`
		TargetDay string `json:"target_day"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid Request Body", http.StatusBadRequest)
		return
	}

	if req.CWID == "" || req.SourceDay == "" || req.TargetDay == "" {
		http.Error(w, "cwid, source_day, and target_day are required", http.StatusBadRequest)
		return
	}

	if req.SourceDay == req.TargetDay {
		http.Error(w, "source_day and target_day must be different", http.StatusBadRequest)
		return
	}

	result, err := database.AutofillFromDay(req.CWID, req.SourceDay, req.TargetDay)
	if err != nil {
		if strings.Contains(err.Error(), "locked") {
			http.Error(w, err.Error(), http.StatusForbidden)
		} else {
			http.Error(w, "Failed to autofill schedule", http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
