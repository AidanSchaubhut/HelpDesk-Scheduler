package handlers

import (
	"encoding/json"
	"net/http"

	"helpdesk-scheduler/database"
)

func GetNotificationSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := database.GetNotificationSettings()
	if err != nil {
		http.Error(w, "Failed to fetch notification settings", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(settings)
}

func SetNotificationSettings(w http.ResponseWriter, r *http.Request) {
	var settings database.NotificationSettings
	if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if err := database.SetNotificationSettings(settings); err != nil {
		http.Error(w, "Failed to update notification settings", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
