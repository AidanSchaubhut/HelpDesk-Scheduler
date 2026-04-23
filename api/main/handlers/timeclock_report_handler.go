package handlers

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"io"
	"math"
	"net/http"
	"sort"
	"strings"
	"time"

	"helpdesk-scheduler/database"
)

const toleranceMinutes = 15

// parseFlexDate parses dates in YYYY-MM-DD, M/D/YYYY, or M/D/YY format.
func parseFlexDate(dateStr string) (time.Time, error) {
	for _, layout := range []string{"2006-01-02", "1/2/2006", "1/2/06"} {
		t, err := time.Parse(layout, dateStr)
		if err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("cannot parse date: %s", dateStr)
}

// timeclockEntry represents a single parsed timeclock row.
type timeclockEntry struct {
	Name     string
	Date     string // MM/DD/YYYY
	Day      string // Monday-Friday
	ClockIn  string // HH:mm
	ClockOut string // HH:mm
}

// scheduleBlock represents a merged contiguous schedule block.
type scheduleBlock struct {
	Name           string
	Day            string
	ScheduledStart string // HH:mm
	ScheduledEnd   string // HH:mm
}

// comparisonResult holds one row of the comparison output.
type comparisonResult struct {
	Name           string
	Day            string
	Date           string
	ScheduledStart string
	ScheduledEnd   string
	ActualIn       string
	ActualOut      string
	StartDiff      int
	EndDiff        int
	Status         string
	HasDiffs       bool // whether StartDiff/EndDiff are meaningful
}

// GenerateTimeclockReport handles POST /api/schedule/timeclock-report
// Accepts a Workday timeclock CSV, compares against the current schedule,
// and returns a standalone HTML timeline report.
func GenerateTimeclockReport(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 5<<20) // 5MB limit

	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Missing or invalid file upload", http.StatusBadRequest)
		return
	}
	defer file.Close()

	raw, err := io.ReadAll(file)
	if err != nil {
		http.Error(w, "Failed to read uploaded file", http.StatusBadRequest)
		return
	}

	// Strip UTF-8 BOM
	raw = bytes.TrimPrefix(raw, []byte{0xEF, 0xBB, 0xBF})

	// Parse timeclock CSV
	timeclockEntries, err := parseTimeclockCSV(raw)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Get schedule from DB and merge into blocks
	scheduleBlocks, err := getScheduleBlocks()
	if err != nil {
		http.Error(w, "Failed to fetch schedule data", http.StatusInternalServerError)
		return
	}

	// Run comparison
	results := compareTimeclock(timeclockEntries, scheduleBlocks)

	// Derive week label from timeclock dates
	weekLabel := deriveWeekLabel(timeclockEntries)

	// Generate HTML
	html := generateHTMLReport(results, weekLabel)

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	if weekLabel != "" {
		w.Header().Set("X-Week-Label", weekLabel)
	}
	w.Write([]byte(html))
}

// parseTimeclockCSV parses the Workday Time Block Audit CSV.
func parseTimeclockCSV(raw []byte) ([]timeclockEntry, error) {
	reader := csv.NewReader(bytes.NewReader(raw))
	reader.LazyQuotes = true
	reader.FieldsPerRecord = -1

	allRows, err := reader.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("invalid CSV: %v", err)
	}

	// Find header row containing "Worker"
	headerIdx := -1
	for i, row := range allRows {
		if len(row) > 0 && strings.TrimSpace(row[0]) == "Worker" {
			headerIdx = i
			break
		}
	}
	if headerIdx == -1 {
		return nil, fmt.Errorf("could not find header row with 'Worker' column in timeclock CSV")
	}

	headers := make([]string, len(allRows[headerIdx]))
	for i, h := range allRows[headerIdx] {
		headers[i] = strings.TrimSpace(h)
	}
	colIdx := make(map[string]int)
	for i, h := range headers {
		colIdx[h] = i
	}

	requiredCols := []string{"Worker", "Newest Calculated Date", "Time Block In Time: HH:mm", "Time Block Out Time: HH:mm"}
	for _, col := range requiredCols {
		if _, ok := colIdx[col]; !ok {
			return nil, fmt.Errorf("missing required column: %s", col)
		}
	}

	// Find the max column index we need so we can skip short rows
	maxCol := 0
	for _, col := range requiredCols {
		if colIdx[col] > maxCol {
			maxCol = colIdx[col]
		}
	}

	// Deduplicate by (name, date, in, out)
	type dedupKey struct {
		name, date, in, out string
	}
	seen := make(map[dedupKey]bool)
	var entries []timeclockEntry

	for _, row := range allRows[headerIdx+1:] {
		if len(row) <= maxCol {
			continue
		}

		name := strings.TrimSpace(row[colIdx["Worker"]])
		if name == "" {
			continue
		}
		dateStr := strings.TrimSpace(row[colIdx["Newest Calculated Date"]])
		inTime := strings.TrimSpace(row[colIdx["Time Block In Time: HH:mm"]])
		outTime := strings.TrimSpace(row[colIdx["Time Block Out Time: HH:mm"]])

		if dateStr == "" || inTime == "" || outTime == "" {
			continue
		}

		key := dedupKey{name, dateStr, inTime, outTime}
		if seen[key] {
			continue
		}
		seen[key] = true

		dateObj, err := parseFlexDate(dateStr)
		if err != nil {
			continue
		}

		entries = append(entries, timeclockEntry{
			Name:     name,
			Date:     dateStr,
			Day:      dateObj.Weekday().String(),
			ClockIn:  inTime,
			ClockOut: outTime,
		})
	}

	return entries, nil
}

// getScheduleBlocks reads schedule from DB and merges contiguous 30-min slots.
func getScheduleBlocks() ([]scheduleBlock, error) {
	entries, err := database.GetAllScheduleEntries()
	if err != nil {
		return nil, err
	}

	type groupKey struct {
		name string
		day  string
	}
	grouped := make(map[groupKey][]int)
	for _, e := range entries {
		k := groupKey{name: e.StudentName, day: e.Day}
		mins := slotStartMinutes(e.Slot)
		grouped[k] = append(grouped[k], mins)
	}

	var blocks []scheduleBlock
	for k, slots := range grouped {
		sort.Ints(slots)
		// Deduplicate (student may have multiple teams in same slot)
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
				blocks = append(blocks, scheduleBlock{
					Name:           k.name,
					Day:            k.day,
					ScheduledStart: minutesTo24h(blockStart),
					ScheduledEnd:   minutesTo24h(blockEnd),
				})
				blockStart = deduped[i]
				blockEnd = deduped[i] + 30
			}
		}
		blocks = append(blocks, scheduleBlock{
			Name:           k.name,
			Day:            k.day,
			ScheduledStart: minutesTo24h(blockStart),
			ScheduledEnd:   minutesTo24h(blockEnd),
		})
	}

	return blocks, nil
}

// timeToMinutes converts "HH:mm" or "H:mm" to minutes since midnight.
func timeToMinutes(t string) int {
	parts := strings.Split(t, ":")
	if len(parts) != 2 {
		return 0
	}
	h := 0
	m := 0
	fmt.Sscanf(parts[0], "%d", &h)
	fmt.Sscanf(parts[1], "%d", &m)
	return h*60 + m
}

// compareTimeclock runs the comparison between timeclock and schedule data.
func compareTimeclock(timeclock []timeclockEntry, schedule []scheduleBlock) []comparisonResult {
	type groupKey struct {
		name string
		day  string
	}

	actualByKey := make(map[groupKey][]timeclockEntry)
	for _, e := range timeclock {
		k := groupKey{strings.ToUpper(e.Name), e.Day}
		actualByKey[k] = append(actualByKey[k], e)
	}

	schedByKey := make(map[groupKey][]scheduleBlock)
	for _, b := range schedule {
		k := groupKey{strings.ToUpper(b.Name), b.Day}
		schedByKey[k] = append(schedByKey[k], b)
	}

	allKeys := make(map[groupKey]bool)
	for k := range actualByKey {
		allKeys[k] = true
	}
	for k := range schedByKey {
		allKeys[k] = true
	}

	var results []comparisonResult

	for key := range allKeys {
		scheduled := schedByKey[key]
		actual := actualByKey[key]

		if len(scheduled) == 0 && len(actual) > 0 {
			// Clocked in but not scheduled
			for _, a := range actual {
				results = append(results, comparisonResult{
					Name:      key.name,
					Day:       key.day,
					Date:      a.Date,
					ActualIn:  a.ClockIn,
					ActualOut: a.ClockOut,
					Status:    "UNSCHEDULED - Clocked in without schedule",
				})
			}
			continue
		}

		if len(scheduled) > 0 && len(actual) == 0 {
			// Scheduled but never clocked in
			for _, s := range scheduled {
				results = append(results, comparisonResult{
					Name:           key.name,
					Day:            key.day,
					ScheduledStart: s.ScheduledStart,
					ScheduledEnd:   s.ScheduledEnd,
					Status:         "NO SHOW - Scheduled but did not clock in",
				})
			}
			continue
		}

		// Both exist — match blocks by closest start time
		matched, unmatchedSched, unmatchedActual := matchBlocks(scheduled, actual)

		for _, pair := range matched {
			s := pair.sched
			a := pair.actual

			sStart := timeToMinutes(s.ScheduledStart)
			sEnd := timeToMinutes(s.ScheduledEnd)
			aStart := timeToMinutes(a.ClockIn)
			aEnd := timeToMinutes(a.ClockOut)

			startDiff := aStart - sStart // positive = late
			endDiff := aEnd - sEnd       // positive = stayed late

			var issues []string
			if abs(startDiff) > toleranceMinutes {
				if startDiff > 0 {
					issues = append(issues, fmt.Sprintf("Clocked in %d min late", startDiff))
				} else {
					issues = append(issues, fmt.Sprintf("Clocked in %d min early", abs(startDiff)))
				}
			}
			if abs(endDiff) > toleranceMinutes {
				if endDiff > 0 {
					issues = append(issues, fmt.Sprintf("Clocked out %d min late", endDiff))
				} else {
					issues = append(issues, fmt.Sprintf("Left %d min early", abs(endDiff)))
				}
			}

			status := "OK"
			if len(issues) > 0 {
				status = strings.Join(issues, "; ")
			}

			results = append(results, comparisonResult{
				Name:           key.name,
				Day:            key.day,
				Date:           a.Date,
				ScheduledStart: s.ScheduledStart,
				ScheduledEnd:   s.ScheduledEnd,
				ActualIn:       a.ClockIn,
				ActualOut:      a.ClockOut,
				StartDiff:      startDiff,
				EndDiff:        endDiff,
				HasDiffs:       true,
				Status:         status,
			})
		}

		for _, s := range unmatchedSched {
			results = append(results, comparisonResult{
				Name:           key.name,
				Day:            key.day,
				ScheduledStart: s.ScheduledStart,
				ScheduledEnd:   s.ScheduledEnd,
				Status:         "NO SHOW - Scheduled but did not clock in",
			})
		}

		for _, a := range unmatchedActual {
			results = append(results, comparisonResult{
				Name:      key.name,
				Day:       key.day,
				Date:      a.Date,
				ActualIn:  a.ClockIn,
				ActualOut: a.ClockOut,
				Status:    "UNSCHEDULED - Clocked in without schedule",
			})
		}
	}

	// Sort: by name, then date, then earliest time
	sort.Slice(results, func(i, j int) bool {
		if results[i].Name != results[j].Name {
			return results[i].Name < results[j].Name
		}
		di := parseDateForSort(results[i].Date, results[i].Day)
		dj := parseDateForSort(results[j].Date, results[j].Day)
		if !di.Equal(dj) {
			return di.Before(dj)
		}
		ti := earliestTime(results[i])
		tj := earliestTime(results[j])
		return ti < tj
	})

	return results
}

type matchedPair struct {
	sched  scheduleBlock
	actual timeclockEntry
}

// matchBlocks pairs scheduled blocks to actual blocks by closest start time.
func matchBlocks(scheduled []scheduleBlock, actual []timeclockEntry) ([]matchedPair, []scheduleBlock, []timeclockEntry) {
	var matched []matchedPair
	usedActual := make(map[int]bool)
	matchedSchedIdx := make(map[int]bool)

	for si, s := range scheduled {
		sStart := timeToMinutes(s.ScheduledStart)
		bestIdx := -1
		bestDiff := math.MaxInt32

		for ai, a := range actual {
			if usedActual[ai] {
				continue
			}
			aStart := timeToMinutes(a.ClockIn)
			diff := abs(sStart - aStart)
			if diff < bestDiff {
				bestDiff = diff
				bestIdx = ai
			}
		}

		if bestIdx >= 0 {
			matched = append(matched, matchedPair{sched: s, actual: actual[bestIdx]})
			usedActual[bestIdx] = true
			matchedSchedIdx[si] = true
		}
	}

	var unmatchedSched []scheduleBlock
	for i, s := range scheduled {
		if !matchedSchedIdx[i] {
			unmatchedSched = append(unmatchedSched, s)
		}
	}

	var unmatchedActual []timeclockEntry
	for i, a := range actual {
		if !usedActual[i] {
			unmatchedActual = append(unmatchedActual, a)
		}
	}

	return matched, unmatchedSched, unmatchedActual
}

func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}

func parseDateForSort(dateStr, day string) time.Time {
	if dateStr != "" {
		t, err := parseFlexDate(dateStr)
		if err == nil {
			return t
		}
	}
	do := map[string]int{"Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3, "Friday": 4}
	return time.Date(1900, 1, 1+do[day], 0, 0, 0, 0, time.UTC)
}

func earliestTime(r comparisonResult) int {
	best := math.MaxInt32
	if r.ScheduledStart != "" {
		if v := timeToMinutes(r.ScheduledStart); v < best {
			best = v
		}
	}
	if r.ActualIn != "" {
		if v := timeToMinutes(r.ActualIn); v < best {
			best = v
		}
	}
	return best
}

func deriveWeekLabel(entries []timeclockEntry) string {
	var dates []time.Time
	for _, e := range entries {
		t, err := parseFlexDate(e.Date)
		if err == nil {
			dates = append(dates, t)
		}
	}
	if len(dates) == 0 {
		return ""
	}
	minDate := dates[0]
	maxDate := dates[0]
	for _, d := range dates[1:] {
		if d.Before(minDate) {
			minDate = d
		}
		if d.After(maxDate) {
			maxDate = d
		}
	}
	return fmt.Sprintf("%s - %s", minDate.Format("01/02/2006"), maxDate.Format("01/02/2006"))
}

// ---- HTML Report Generation ----

const (
	timelineStartMin = 7 * 60  // 7:00 AM
	timelineEndMin   = 22 * 60 // 10:00 PM
	timelineSpan     = timelineEndMin - timelineStartMin
)

func pct(minutes int) float64 {
	p := float64(minutes-timelineStartMin) / float64(timelineSpan) * 100
	if p < 0 {
		return 0
	}
	if p > 100 {
		return 100
	}
	return p
}

func bar(startMin, endMin int, cssClass string) string {
	left := pct(startMin)
	width := pct(endMin) - left
	if width < 0.3 {
		width = 0.3
	}
	return fmt.Sprintf(`<div class="bar %s" style="left:%.2f%%;width:%.2f%%"></div>`, cssClass, left, width)
}

func hourMarkers() string {
	var buf strings.Builder
	for h := timelineStartMin / 60; h <= timelineEndMin/60; h++ {
		left := pct(h * 60)
		label := h % 12
		if label == 0 {
			label = 12
		}
		suffix := "a"
		if h >= 12 {
			suffix = "p"
		}
		fmt.Fprintf(&buf, `<div class="hour-mark" style="left:%.2f%%"><div class="hour-line"></div><div class="hour-label">%d%s</div></div>`, left, label, suffix)
	}
	return buf.String()
}

func generateHTMLReport(results []comparisonResult, weekLabel string) string {
	// Group by name, then by (day, date)
	type dayKey struct {
		day  string
		date string
	}
	type personData struct {
		days    []dayKey
		entries map[dayKey][]comparisonResult
	}

	people := make(map[string]*personData)
	var nameOrder []string

	for _, r := range results {
		dk := dayKey{r.Day, r.Date}
		pd, ok := people[r.Name]
		if !ok {
			pd = &personData{entries: make(map[dayKey][]comparisonResult)}
			people[r.Name] = pd
			nameOrder = append(nameOrder, r.Name)
		}
		if _, exists := pd.entries[dk]; !exists {
			pd.days = append(pd.days, dk)
		}
		pd.entries[dk] = append(pd.entries[dk], r)
	}

	// Build rows HTML
	var rowsHTML strings.Builder
	markers := hourMarkers()

	for _, name := range nameOrder {
		pd := people[name]
		fmt.Fprintf(&rowsHTML, `<div class="person-header">%s</div>`, name)

		for _, dk := range pd.days {
			entries := pd.entries[dk]
			dateLabel := dk.day
			if dk.date != "" {
				dateLabel += " " + dk.date
			} else {
				dateLabel += " (no clock data)"
			}

			var bars strings.Builder
			var tooltips []string

			for _, entry := range entries {
				// Scheduled bar
				if entry.ScheduledStart != "" && entry.ScheduledEnd != "" {
					sStart := timeToMinutes(entry.ScheduledStart)
					sEnd := timeToMinutes(entry.ScheduledEnd)
					bars.WriteString(bar(sStart, sEnd, "scheduled"))
					tooltips = append(tooltips, fmt.Sprintf("Scheduled: %s-%s", entry.ScheduledStart, entry.ScheduledEnd))
				}

				// Actual bar
				if entry.ActualIn != "" && entry.ActualOut != "" {
					aStart := timeToMinutes(entry.ActualIn)
					aEnd := timeToMinutes(entry.ActualOut)

					css := "actual-ok"
					if strings.Contains(entry.Status, "UNSCHEDULED") {
						css = "actual-unscheduled"
					} else if entry.Status != "OK" {
						css = "actual-discrepancy"
					}

					bars.WriteString(bar(aStart, aEnd, css))
					tooltips = append(tooltips, fmt.Sprintf("Actual: %s-%s", entry.ActualIn, entry.ActualOut))
				}

				if strings.Contains(entry.Status, "NO SHOW") {
					tooltips = append(tooltips, "NO SHOW")
				}
			}

			// Determine badge
			badgeClass := "badge-ok"
			badgeText := "OK"
			allOK := true
			hasNoShow := false
			hasUnsched := false
			for _, e := range entries {
				if e.Status != "OK" {
					allOK = false
				}
				if strings.Contains(e.Status, "NO SHOW") {
					hasNoShow = true
				}
				if strings.Contains(e.Status, "UNSCHEDULED") {
					hasUnsched = true
				}
			}
			if !allOK {
				if hasNoShow {
					badgeClass = "badge-noshow"
					badgeText = "NO SHOW"
				} else if hasUnsched {
					badgeClass = "badge-unscheduled"
					badgeText = "UNSCHEDULED"
				} else {
					badgeClass = "badge-discrepancy"
					badgeText = "DISCREPANCY"
				}
			}

			// Status details text
			var statusParts []string
			for _, e := range entries {
				if e.Status != "OK" {
					statusParts = append(statusParts, e.Status)
				}
			}
			statusDetails := strings.Join(statusParts, "; ")

			tooltipText := strings.Join(tooltips, " | ")

			fmt.Fprintf(&rowsHTML, `
            <div class="row">
                <div class="row-label">
                    <span class="day-label">%s</span>
                    <span class="badge %s">%s</span>
                </div>
                <div class="timeline" title="%s">
                    %s
                    %s
                </div>
                <div class="row-status">%s</div>
            </div>`, dateLabel, badgeClass, badgeText, tooltipText, markers, bars.String(), statusDetails)
		}
	}

	// Summary stats
	total := len(results)
	ok := 0
	discrepancies := 0
	noShows := 0
	unscheduled := 0
	for _, r := range results {
		switch {
		case r.Status == "OK":
			ok++
		case strings.Contains(r.Status, "NO SHOW"):
			noShows++
		case strings.Contains(r.Status, "UNSCHEDULED"):
			unscheduled++
		default:
			discrepancies++
		}
	}

	titleSuffix := ""
	if weekLabel != "" {
		titleSuffix = " &mdash; " + weekLabel
	}

	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Schedule vs. Timeclock Report%s</title>
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: #333; padding: 20px; }
    .report-header { background: #fff; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .report-header h1 { font-size: 1.4em; margin-bottom: 12px; }
    .summary { display: flex; gap: 20px; flex-wrap: wrap; }
    .stat { padding: 8px 16px; border-radius: 6px; font-size: 0.9em; }
    .stat-ok { background: #e8f5e9; color: #2e7d32; }
    .stat-disc { background: #fff3e0; color: #e65100; }
    .stat-noshow { background: #fce4ec; color: #c62828; }
    .stat-unsched { background: #e3f2fd; color: #1565c0; }
    .stat-total { background: #f3e5f5; color: #6a1b9a; }
    .legend { display: flex; gap: 16px; margin-top: 14px; flex-wrap: wrap; }
    .legend-item { display: flex; align-items: center; gap: 6px; font-size: 0.8em; color: #666; }
    .legend-swatch { width: 24px; height: 10px; border-radius: 3px; }
    .container { background: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .person-header { font-weight: 700; font-size: 1.05em; padding: 14px 0 6px 0; border-bottom: 2px solid #e0e0e0; margin-top: 8px; }
    .person-header:first-child { margin-top: 0; }
    .row { display: grid; grid-template-columns: 200px 1fr 260px; align-items: center; padding: 6px 0; border-bottom: 1px solid #f0f0f0; gap: 10px; }
    .row:hover { background: #fafafa; }
    .row-label { font-size: 0.82em; }
    .day-label { display: block; color: #555; }
    .row-status { font-size: 0.75em; color: #888; }
    .badge { display: inline-block; font-size: 0.65em; font-weight: 600; padding: 2px 6px; border-radius: 3px; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.3px; }
    .badge-ok { background: #e8f5e9; color: #2e7d32; }
    .badge-discrepancy { background: #fff3e0; color: #e65100; }
    .badge-noshow { background: #fce4ec; color: #c62828; }
    .badge-unscheduled { background: #e3f2fd; color: #1565c0; }
    .timeline { position: relative; height: 28px; background: #fafafa; border: 1px solid #eee; border-radius: 4px; overflow: hidden; }
    .bar { position: absolute; top: 0; height: 100%%; border-radius: 3px; opacity: 0.7; }
    .scheduled { background: #90caf9; top: 0; height: 50%%; z-index: 1; }
    .actual-ok { background: #66bb6a; top: 50%%; height: 50%%; z-index: 2; }
    .actual-discrepancy { background: #ffa726; top: 50%%; height: 50%%; z-index: 2; }
    .actual-unscheduled { background: #7e57c2; top: 50%%; height: 50%%; z-index: 2; }
    .hour-mark { position: absolute; top: 0; height: 100%%; z-index: 0; }
    .hour-line { position: absolute; top: 0; width: 1px; height: 100%%; background: #e8e8e8; }
    .hour-label { position: absolute; top: -1px; left: 3px; font-size: 0.55em; color: #bbb; user-select: none; }
    @media (max-width: 900px) {
        .row { grid-template-columns: 140px 1fr; }
        .row-status { display: none; }
    }
</style>
</head>
<body>
<div class="report-header">
    <h1>Schedule vs. Timeclock Report%s</h1>
    <div class="summary">
        <div class="stat stat-total">Total: %d</div>
        <div class="stat stat-ok">OK: %d</div>
        <div class="stat stat-disc">Discrepancies: %d</div>
        <div class="stat stat-noshow">No Shows: %d</div>
        <div class="stat stat-unsched">Unscheduled: %d</div>
    </div>
    <div class="legend">
        <div class="legend-item"><div class="legend-swatch" style="background:#90caf9"></div> Scheduled</div>
        <div class="legend-item"><div class="legend-swatch" style="background:#66bb6a"></div> Actual (OK)</div>
        <div class="legend-item"><div class="legend-swatch" style="background:#ffa726"></div> Actual (Discrepancy)</div>
        <div class="legend-item"><div class="legend-swatch" style="background:#7e57c2"></div> Actual (Unscheduled)</div>
        <div class="legend-item"><div class="legend-swatch" style="background:#fce4ec"></div> No Show</div>
    </div>
</div>
<div class="container">
    %s
</div>
</body>
</html>`, titleSuffix, titleSuffix, total, ok, discrepancies, noShows, unscheduled, rowsHTML.String())
}
