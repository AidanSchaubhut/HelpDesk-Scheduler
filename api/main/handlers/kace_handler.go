package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"helpdesk-scheduler/database"
	"helpdesk-scheduler/kace"
)

// KACETicketsResponse is the combined response for the single KACE endpoint.
type KACETicketsResponse struct {
	// Students maps cwid → ticket count
	Students map[string]int `json:"students"`
	// Teams maps team_id → total ticket count (student tickets + queue tickets)
	Teams map[string]int `json:"teams"`
}

var weekdays = []string{"Monday", "Tuesday", "Wednesday", "Thursday", "Friday"}

func todayWeekday() string {
	day := time.Now().Weekday() // 0=Sunday
	if day >= time.Monday && day <= time.Friday {
		return weekdays[day-1]
	}
	return ""
}

// GetKACETickets handles GET /api/kace/tickets
// 1. Gets today's scheduled students and team queue usernames from the DB
// 2. Calls KACE once with all usernames (students + queue owners)
// 3. Aggregates per-student and per-team counts
func GetKACETickets(w http.ResponseWriter, r *http.Request) {
	resp := KACETicketsResponse{
		Students: make(map[string]int),
		Teams:    make(map[string]int),
	}

	today := todayWeekday()
	if today == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
		return
	}

	// Get all students scheduled today
	scheduled, err := database.GetScheduledStudentsByDay(today)
	if err != nil {
		http.Error(w, "Failed to fetch schedule", http.StatusInternalServerError)
		return
	}

	// Get all teams to read their kace_queue_user values
	teams, err := database.GetAllTeams()
	if err != nil {
		http.Error(w, "Failed to fetch teams", http.StatusInternalServerError)
		return
	}

	// Build mappings
	// user_id (KACE username) → cwid
	userIDToCWID := make(map[string]string)
	// cwid → set of team_ids
	cwidToTeams := make(map[string]map[string]bool)
	// queue username → team_id
	queueUserToTeam := make(map[string]string)

	var usernames []string

	for _, s := range scheduled {
		if _, seen := userIDToCWID[s.UserID]; !seen {
			userIDToCWID[s.UserID] = s.CWID
			usernames = append(usernames, s.UserID)
		}
		if cwidToTeams[s.CWID] == nil {
			cwidToTeams[s.CWID] = make(map[string]bool)
		}
		cwidToTeams[s.CWID][s.TeamID] = true
	}

	// Add queue usernames from teams
	for _, team := range teams {
		if team.KaceQueueUser != "" {
			queueUserToTeam[team.KaceQueueUser] = team.ID
			// Only add if not already in the list (unlikely overlap but safe)
			if _, exists := userIDToCWID[team.KaceQueueUser]; !exists {
				usernames = append(usernames, team.KaceQueueUser)
			}
		}
	}

	if len(usernames) == 0 {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
		return
	}

	// Fetch tickets from KACE
	tickets, err := kace.FetchTickets(usernames)
	if err != nil {
		log.Printf("KACE error: %v", err)
		// Return empty data so the page still loads
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
		return
	}

	// Count tickets
	for _, ticket := range tickets {
		owner := ticket.Owner.UserName

		// Check if this is a queue owner
		if teamID, isQueue := queueUserToTeam[owner]; isQueue {
			resp.Teams[teamID]++
			continue
		}

		// Otherwise it's a student
		cwid, ok := userIDToCWID[owner]
		if !ok {
			continue
		}
		resp.Students[cwid]++
	}

	// Add student ticket counts to their team totals
	for cwid, count := range resp.Students {
		for teamID := range cwidToTeams[cwid] {
			resp.Teams[teamID] += count
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
