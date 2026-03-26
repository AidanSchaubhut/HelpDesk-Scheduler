package handlers

import (
	"encoding/json"
	"net/http"

	"helpdesk-scheduler/auth"
	"helpdesk-scheduler/database"
	"helpdesk-scheduler/models"
)

func CreateAttendancePoint(w http.ResponseWriter, r *http.Request) {
	var req models.CreateAttendancePointParams
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid Request Body", http.StatusBadRequest)
		return
	}

	if req.CWID == "" || req.Reason == "" {
		http.Error(w, "cwid and reason are required", http.StatusBadRequest)
		return
	}

	adminCWID := auth.GetCWID(r)

	id, err := database.CreateAttendancePoint(req, adminCWID)
	if err != nil {
		http.Error(w, "Failed to create attendance point", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]int64{"id": id})
}

func GetMyPoints(w http.ResponseWriter, r *http.Request) {
	cwid := auth.GetCWID(r)

	history, total, err := database.GetPointsByStudent(cwid)
	if err != nil {
		http.Error(w, "Failed to fetch points", http.StatusInternalServerError)
		return
	}

	if history == nil {
		history = []models.AttendancePoint{}
	}

	resp := models.MyPointsResponse{
		TotalPoints:     total,
		DisciplineLevel: database.DisciplineLevel(total),
		History:         history,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func GetAllPointsSummary(w http.ResponseWriter, r *http.Request) {
	summaries, err := database.GetAllPointsSummary()
	if err != nil {
		http.Error(w, "Failed to fetch points summary", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(summaries)
}

func GetAllAttendancePoints(w http.ResponseWriter, r *http.Request) {
	points, err := database.GetAllAttendancePoints()
	if err != nil {
		http.Error(w, "Failed to fetch attendance points", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(points)
}

func DeleteAllAttendancePoints(w http.ResponseWriter, r *http.Request) {
	deleted, err := database.DeleteAllAttendancePoints()
	if err != nil {
		http.Error(w, "Failed to clear attendance points", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]int64{"deleted": deleted})
}
