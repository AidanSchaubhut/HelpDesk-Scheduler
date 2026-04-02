package kace

import (
	"log"
	"time"

	"helpdesk-scheduler/database"
)

var weekdays = []string{"Monday", "Tuesday", "Wednesday", "Thursday", "Friday"}

func todayWeekday() string {
	day := time.Now().Weekday() // 0=Sunday
	if day >= time.Monday && day <= time.Friday {
		return weekdays[day-1]
	}
	return ""
}

// StartPoller begins the background KACE ticket polling loop.
// It runs immediately on startup, then every interval.
func StartPoller(interval time.Duration) {
	// Don't start if KACE is not configured
	if getHost() == "" {
		return
	}

	go func() {
		pollOnce()

		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for range ticker.C {
			pollOnce()
		}
	}()
}

func pollOnce() {
	today := todayWeekday()
	if today == "" {
		return // weekend
	}

	// Get scheduled students for today
	scheduled, err := database.GetScheduledStudentsByDay(today)
	if err != nil {
		log.Printf("KACE poller: failed to get schedule: %v", err)
		return
	}

	// Get teams for queue users
	teams, err := database.GetAllTeams()
	if err != nil {
		log.Printf("KACE poller: failed to get teams: %v", err)
		return
	}

	// Clear old ticket data
	if err := database.ClearKACETickets(); err != nil {
		log.Printf("KACE poller: failed to clear tickets: %v", err)
		return
	}

	// Fetch per-student ticket counts (deduplicate by user_id)
	seen := make(map[string]bool)
	studentCount := 0
	for _, s := range scheduled {
		if seen[s.UserID] || s.UserID == "" {
			continue
		}
		seen[s.UserID] = true

		count, err := FetchTicketCount(s.UserID)
		if err != nil {
			log.Printf("KACE poller: error fetching for %s: %v", s.UserID, err)
			continue
		}

		if err := database.UpsertKACETicketCount(s.UserID, s.CWID, "", count); err != nil {
			log.Printf("KACE poller: DB write error for %s: %v", s.UserID, err)
		}
		studentCount++

		time.Sleep(200 * time.Millisecond)
	}

	// Fetch per-team queue ticket counts
	queueCount := 0
	for _, team := range teams {
		if team.KaceQueueUser == "" {
			continue
		}

		count, err := FetchTicketCount(team.KaceQueueUser)
		if err != nil {
			log.Printf("KACE poller: error fetching queue for team %s: %v", team.ID, err)
			continue
		}

		if err := database.UpsertKACETicketCount(team.KaceQueueUser, "", team.ID, count); err != nil {
			log.Printf("KACE poller: DB write error for team %s: %v", team.ID, err)
		}
		queueCount++

		time.Sleep(200 * time.Millisecond)
	}

	log.Printf("KACE poller: completed cycle (%d students, %d team queues)", studentCount, queueCount)
}
