package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"helpdesk-scheduler/database"
	"helpdesk-scheduler/models"
)

func CreateTeam(w http.ResponseWriter, r *http.Request) {
	var req models.CreateTeamParams

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid Request Body", http.StatusBadRequest)
		return
	}

	if req.ID == "" || req.Name == "" || req.Color == "" {
		http.Error(w, "ID, Name, and Color are required", http.StatusBadRequest)
		return
	}

	if err := database.CreateTeam(req); err != nil {
		http.Error(w, "Failed to create Team", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func GetAllTeams(w http.ResponseWriter, r *http.Request) {
	teams, err := database.GetAllTeams()
	if err != nil {
		http.Error(w, "Failed to fetch teams", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(teams)
}

func GetTeam(w http.ResponseWriter, r *http.Request) {
	team_id := chi.URLParam(r, "id")
	if team_id == "" {
		http.Error(w, "id is required", http.StatusBadRequest)
		return
	}

	team, err := database.GetTeam(team_id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(team)
}

func UpdateTeam(w http.ResponseWriter, r *http.Request) {
	team_id := chi.URLParam(r, "id")
	if team_id == "" {
		http.Error(w, "id is required", http.StatusBadRequest)
		return
	}

	var req models.UpdateTeamParams
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid Request Body", http.StatusBadRequest)
		return
	}

	if err := database.UpdateTeam(team_id, req); err != nil {
		if strings.Contains(err.Error(), "not found") {
			http.Error(w, err.Error(), http.StatusNotFound)
		} else if strings.Contains(err.Error(), "no fields") {
			http.Error(w, err.Error(), http.StatusBadRequest)
		} else {
			http.Error(w, "Failed to update team", http.StatusInternalServerError)
		}
		return
	}

	w.WriteHeader(http.StatusOK)
}

func DeleteTeam(w http.ResponseWriter, r *http.Request) {
	team_id := chi.URLParam(r, "id")
	if team_id == "" {
		http.Error(w, "id is required", http.StatusBadRequest)
		return
	}

	if err := database.DeleteTeam(team_id); err != nil {
		if strings.Contains(err.Error(), "not found") {
			http.Error(w, err.Error(), http.StatusNotFound)
		} else {
			http.Error(w, "Failed to delete Team", http.StatusInternalServerError)
		}
		return
	}

	w.WriteHeader(http.StatusOK)
}