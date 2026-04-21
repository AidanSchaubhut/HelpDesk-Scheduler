package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"helpdesk-scheduler/auth"
	"helpdesk-scheduler/database"
	"helpdesk-scheduler/models"
	"helpdesk-scheduler/slack"
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

	if settings, err := database.GetNotificationSettings(); err == nil && settings.AttendanceNotify {
		if student, err := database.GetStudent(req.CWID); err == nil && student.User_ID != "" {
			pointLabel := fmt.Sprintf("%g", req.Points)
			go slack.Notify(slack.Message{
				Channel:     student.User_ID + "@latech.edu",
				MessageText: fmt.Sprintf("You have received *%s* attendance point(s): %s", pointLabel, req.Reason),
			})
		}
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

func DeleteAttendancePoint(w http.ResponseWriter, r *http.Request) {
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

	if err := database.DeleteAttendancePoint(id); err != nil {
		if strings.Contains(err.Error(), "not found") {
			http.Error(w, err.Error(), http.StatusNotFound)
		} else {
			http.Error(w, "Failed to delete attendance point", http.StatusInternalServerError)
		}
		return
	}

	w.WriteHeader(http.StatusOK)
}
