package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"helpdesk-scheduler/database"
	"helpdesk-scheduler/models"
)

func GetAllTeamHours(w http.ResponseWriter, r *http.Request) {
	hours, err := database.GetAllTeamHours()
	if err != nil {
		http.Error(w, "Failed to get team hours: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if hours == nil {
		hours = []models.TeamHours{}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(hours)
}

func SetTeamHours(w http.ResponseWriter, r *http.Request) {
	teamID := chi.URLParam(r, "teamId")

	var entries []models.SetTeamHoursParams
	if err := json.NewDecoder(r.Body).Decode(&entries); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	for _, e := range entries {
		if e.Day == "" || e.StartTime == "" || e.EndTime == "" {
			http.Error(w, "Each entry requires day, start_time, and end_time", http.StatusBadRequest)
			return
		}
	}

	if err := database.SetTeamHours(teamID, entries); err != nil {
		http.Error(w, "Failed to set team hours: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
