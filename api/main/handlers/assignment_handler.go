package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"helpdesk-scheduler/database"
)

func AssignStudent(w http.ResponseWriter, r *http.Request) {
	cwid := chi.URLParam(r, "cwid")
	team_id := chi.URLParam(r, "team_id")

	if cwid == "" || team_id == "" {
		http.Error(w, "cwid and team_id are required", http.StatusBadRequest)
		return
	}

	if err := database.AssignStudent(cwid, team_id); err != nil {
		http.Error(w, "Failed to assign student to team", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func UnassignStudent(w http.ResponseWriter, r *http.Request) {
	cwid := chi.URLParam(r, "cwid")
	team_id := chi.URLParam(r, "team_id")

	if cwid == "" || team_id == "" {
		http.Error(w, "cwid and team_id are required", http.StatusBadRequest)
		return
	}

	if err := database.UnassignStudent(cwid, team_id); err != nil {
		if strings.Contains(err.Error(), "not found") {
			http.Error(w, err.Error(), http.StatusNotFound)
		} else {
			http.Error(w, "Failed to unassign student from team", http.StatusInternalServerError)
		}
		return
	}

	w.WriteHeader(http.StatusOK)
}

func GetAllAssignments(w http.ResponseWriter, r *http.Request) {
	assignments, err := database.GetAllAssignments()
	if err != nil {
		http.Error(w, "Failed to fetch assignments", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(assignments)
}

func GetAssignmentsByStudent(w http.ResponseWriter, r *http.Request) {
	cwid := chi.URLParam(r, "cwid")
	if cwid == "" {
		http.Error(w, "cwid is required", http.StatusBadRequest)
		return
	}

	assignments, err := database.GetAssignmentsByStudent(cwid)
	if err != nil {
		http.Error(w, "Failed to fetch assignments", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(assignments)
}

func GetAssignmentsByTeam(w http.ResponseWriter, r *http.Request) {
	team_id := chi.URLParam(r, "team_id")
	if team_id == "" {
		http.Error(w, "team_id is required", http.StatusBadRequest)
		return
	}

	assignments, err := database.GetAssignmentsByTeam(team_id)
	if err != nil {
		http.Error(w, "Failed to fetch assignments", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(assignments)
}
