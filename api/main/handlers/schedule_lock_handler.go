package handlers

import (
	"encoding/json"
	"net/http"

	"helpdesk-scheduler/database"
)

func GetScheduleLock(w http.ResponseWriter, r *http.Request) {
	locked, err := database.GetScheduleLock()
	if err != nil {
		http.Error(w, "Failed to get schedule lock status", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"locked": locked})
}

func SetScheduleLock(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Locked bool `json:"locked"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid Request Body", http.StatusBadRequest)
		return
	}

	if err := database.SetScheduleLock(req.Locked); err != nil {
		http.Error(w, "Failed to update schedule lock", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}
