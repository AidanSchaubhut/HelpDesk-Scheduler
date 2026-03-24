package handlers

import (
	"encoding/json"
	"net/http"

	"helpdesk-scheduler/auth"
	"helpdesk-scheduler/database"
)

func Login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		CWID string `json:"cwid"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid Request Body", http.StatusBadRequest)
		return
	}

	if req.CWID == "" {
		http.Error(w, "cwid is required", http.StatusBadRequest)
		return
	}

	student, err := database.GetStudent(req.CWID)
	if err != nil {
		http.Error(w, "CWID not recognized", http.StatusUnauthorized)
		return
	}

	token, err := auth.GenerateToken(student.CWID, student.Role)
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"token":   token,
		"student": student,
	})
}
