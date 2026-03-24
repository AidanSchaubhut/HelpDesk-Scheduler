package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"helpdesk-scheduler/auth"
	"helpdesk-scheduler/database"
	"helpdesk-scheduler/models"
)

func CreateTimeclockRequest(w http.ResponseWriter, r *http.Request) {
	var params models.CreateTimeclockParams
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if params.CWID == "" || params.ShiftDate == "" || params.StartTime == "" || params.EndTime == "" || params.Reason == "" {
		http.Error(w, "All fields are required: cwid, shift_date, start_time, end_time, reason", http.StatusBadRequest)
		return
	}

	id, err := database.CreateTimeclockRequest(params)
	if err != nil {
		http.Error(w, "Failed to create timeclock request: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]int64{"id": id})
}

func GetTimeclockByStudent(w http.ResponseWriter, r *http.Request) {
	cwid := chi.URLParam(r, "cwid")
	requests, err := database.GetTimeclockByStudent(cwid)
	if err != nil {
		http.Error(w, "Failed to get timeclock requests: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if requests == nil {
		requests = []models.TimeclockRequest{}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests)
}

func GetAllTimeclockRequests(w http.ResponseWriter, r *http.Request) {
	requests, err := database.GetAllTimeclockRequests()
	if err != nil {
		http.Error(w, "Failed to get timeclock requests: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if requests == nil {
		requests = []models.TimeclockRequestDetail{}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests)
}

func ResolveTimeclockRequest(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid request ID", http.StatusBadRequest)
		return
	}

	var params models.ResolveTimeclockParams
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	adminCWID := auth.GetCWID(r)

	if err := database.ResolveTimeclockRequest(id, adminCWID, params.AdminNotes); err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "fixed"})
}
