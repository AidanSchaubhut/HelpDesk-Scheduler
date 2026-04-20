package handlers

import (
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"

	"helpdesk-scheduler/database"
)

// slotStartMinutes parses a slot like "8:00 - 8:30" into minutes from midnight (24h).
// Hours 1-7 are treated as PM (13:00-19:00) since the schedule runs 8 AM - 5 PM.
func slotStartMinutes(slot string) int {
	start := strings.TrimSpace(strings.Split(slot, " - ")[0])
	parts := strings.Split(start, ":")
	h, _ := strconv.Atoi(parts[0])
	m, _ := strconv.Atoi(parts[1])
	if h >= 1 && h <= 7 {
		h += 12
	}
	return h*60 + m
}

// dayOrder maps day names to sort order.
var dayOrder = map[string]int{
	"Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3, "Friday": 4,
}

// minutesTo24h formats minutes from midnight as "HH:MM".
func minutesTo24h(mins int) string {
	return fmt.Sprintf("%02d:%02d", mins/60, mins%60)
}

func ExportScheduleCSV(w http.ResponseWriter, r *http.Request) {
	entries, err := database.GetAllScheduleEntries()
	if err != nil {
		http.Error(w, "Failed to fetch schedule", http.StatusInternalServerError)
		return
	}

	// Group slots by (name, day) and collect start minutes
	type key struct {
		name string
		day  string
	}
	grouped := make(map[key][]int)
	for _, e := range entries {
		k := key{name: e.StudentName, day: e.Day}
		mins := slotStartMinutes(e.Slot)
		grouped[k] = append(grouped[k], mins)
	}

	// Build contiguous blocks
	type csvRow struct {
		name  string
		day   string
		start int
		end   int
	}
	var rows []csvRow

	for k, slots := range grouped {
		sort.Ints(slots)
		// Deduplicate (student may have multiple teams in the same slot)
		deduped := []int{slots[0]}
		for i := 1; i < len(slots); i++ {
			if slots[i] != slots[i-1] {
				deduped = append(deduped, slots[i])
			}
		}

		blockStart := deduped[0]
		blockEnd := deduped[0] + 30
		for i := 1; i < len(deduped); i++ {
			if deduped[i] == blockEnd {
				blockEnd = deduped[i] + 30
			} else {
				rows = append(rows, csvRow{name: k.name, day: k.day, start: blockStart, end: blockEnd})
				blockStart = deduped[i]
				blockEnd = deduped[i] + 30
			}
		}
		rows = append(rows, csvRow{name: k.name, day: k.day, start: blockStart, end: blockEnd})
	}

	// Sort by name, day order, start time
	sort.Slice(rows, func(i, j int) bool {
		if rows[i].name != rows[j].name {
			return rows[i].name < rows[j].name
		}
		if rows[i].day != rows[j].day {
			return dayOrder[rows[i].day] < dayOrder[rows[j].day]
		}
		return rows[i].start < rows[j].start
	})

	// Write CSV
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment; filename=schedule_export.csv")

	fmt.Fprintln(w, "Name,Day,Scheduled Start,Scheduled End")
	for _, row := range rows {
		fmt.Fprintf(w, "%s,%s,%s,%s\n", row.name, row.day, minutesTo24h(row.start), minutesTo24h(row.end))
	}
}
