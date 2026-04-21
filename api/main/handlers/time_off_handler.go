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

func CreateTimeOffRequest(w http.ResponseWriter, r *http.Request) {
	var req models.CreateTimeOffParams

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid Request Body", http.StatusBadRequest)
		return
	}

	// Admins may specify a target CWID; students always use their own
	if auth.GetRole(r) != "admin" || req.CWID == "" {
		req.CWID = auth.GetCWID(r)
	}
	if req.Day == "" {
		http.Error(w, "day is required", http.StatusBadRequest)
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
	cwid := auth.GetCWID(r)

	if idStr == "" {
		http.Error(w, "id is required", http.StatusBadRequest)
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

func UpdateTimeOffStatus(w http.ResponseWriter, r *http.Request) {
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

	var req models.UpdateTimeOffStatusParams
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid Request Body", http.StatusBadRequest)
		return
	}

	if req.Status == "" {
		http.Error(w, "status is required", http.StatusBadRequest)
		return
	}

	if req.Status != "pending" && req.Status != "excused" && req.Status != "unexcused" {
		http.Error(w, "status must be pending, excused, or unexcused", http.StatusBadRequest)
		return
	}

	// Get the admin's CWID from the auth context
	adminCWID := auth.GetCWID(r)

	if err := database.UpdateTimeOffStatus(id, req.Status, adminCWID); err != nil {
		http.Error(w, "Failed to update time off status", http.StatusInternalServerError)
		return
	}

	if req.Status == "excused" || req.Status == "unexcused" {
		if settings, err := database.GetNotificationSettings(); err == nil && settings.TimeOffNotify {
			if cwid, day, date, err := database.GetTimeOffCWID(id); err == nil {
				if student, err := database.GetStudent(cwid); err == nil && student.User_ID != "" {
					detail := day
					if date != "" {
						detail = fmt.Sprintf("%s (%s)", day, date)
					}
					go slack.Notify(slack.Message{
						Channel:     student.User_ID + "@latech.edu",
						MessageText: fmt.Sprintf("Your time-off request for *%s* has been marked *%s*.", detail, req.Status),
					})
				}
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": req.Status})
}

func GetAbsenceCounts(w http.ResponseWriter, r *http.Request) {
	counts, err := database.GetAllAbsenceCounts()
	if err != nil {
		http.Error(w, "Failed to fetch absence counts", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(counts)
}
