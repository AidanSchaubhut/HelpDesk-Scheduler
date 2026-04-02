package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"helpdesk-scheduler/database"
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
// Reads ticket counts from the database (populated by the background KACE poller)
// and aggregates per-student and per-team counts.
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

	// Read ticket counts from DB (written by background poller)
	rows, err := database.GetKACETicketCounts()
	if err != nil {
		log.Printf("KACE handler: DB read error: %v", err)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
		return
	}

	// Get today's schedule to compute team totals from student tickets
	scheduled, err := database.GetScheduledStudentsByDay(today)
	if err != nil {
		log.Printf("KACE handler: failed to get schedule: %v", err)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
		return
	}

	// Build cwid → set of team_ids mapping
	cwidToTeams := make(map[string]map[string]bool)
	for _, s := range scheduled {
		if cwidToTeams[s.CWID] == nil {
			cwidToTeams[s.CWID] = make(map[string]bool)
		}
		cwidToTeams[s.CWID][s.TeamID] = true
	}

	for _, row := range rows {
		if row.CWID != "" {
			// Student row
			resp.Students[row.CWID] = row.TicketCount
			// Add to team totals
			for teamID := range cwidToTeams[row.CWID] {
				resp.Teams[teamID] += row.TicketCount
			}
		} else if row.TeamID != "" {
			// Team queue row
			resp.Teams[row.TeamID] += row.TicketCount
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
