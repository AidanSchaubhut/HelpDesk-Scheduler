package handlers

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"helpdesk-scheduler/database"
	"helpdesk-scheduler/models"
)

type ImportResult struct {
	Created  int      `json:"created"`
	Skipped  int      `json:"skipped"`
	Errors   []string `json:"errors"`
}

// ImportStudents handles POST /api/students/import
// Accepts a CSV file with columns: cwid, user_id, name
// First row is treated as a header and skipped.
func ImportStudents(w http.ResponseWriter, r *http.Request) {
	// Limit upload size to 1MB
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "file is required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Peek at the first line to detect delimiter (tab vs comma)
	raw, err := io.ReadAll(file)
	if err != nil {
		http.Error(w, "failed to read file", http.StatusBadRequest)
		return
	}

	// Strip UTF-8 BOM if present (Excel adds this)
	rawStr := string(raw)
	rawStr = strings.TrimPrefix(rawStr, "\xEF\xBB\xBF")

	reader := csv.NewReader(strings.NewReader(rawStr))
	// If the first line contains tabs but no commas, use tab delimiter
	firstLine := strings.SplitN(rawStr, "\n", 2)[0]
	if strings.Contains(firstLine, "\t") && !strings.Contains(firstLine, ",") {
		reader.Comma = '\t'
	}

	result := ImportResult{}

	// Read and validate header
	header, err := reader.Read()
	if err != nil {
		http.Error(w, "failed to read CSV header", http.StatusBadRequest)
		return
	}

	// Map header columns to indices
	colMap := map[string]int{}
	for i, col := range header {
		colMap[strings.TrimSpace(strings.ToLower(col))] = i
	}

	cwidIdx, hasCwid := colMap["cwid"]
	userIdx, hasUser := colMap["user_id"]
	nameIdx, hasName := colMap["name"]

	if !hasCwid || !hasUser || !hasName {
		http.Error(w, "CSV must have columns: cwid, user_id, name", http.StatusBadRequest)
		return
	}

	rowNum := 1 // header was row 1
	for {
		row, err := reader.Read()
		if err == io.EOF {
			break
		}
		rowNum++
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("row %d: failed to parse", rowNum))
			continue
		}

		maxIdx := max(cwidIdx, max(userIdx, nameIdx))
		if len(row) <= maxIdx {
			result.Errors = append(result.Errors, fmt.Sprintf("row %d: not enough columns", rowNum))
			continue
		}

		cwid := strings.TrimSpace(row[cwidIdx])
		userID := strings.TrimSpace(row[userIdx])
		name := strings.TrimSpace(row[nameIdx])

		if cwid == "" || userID == "" || name == "" {
			result.Errors = append(result.Errors, fmt.Sprintf("row %d: cwid, user_id, and name are all required", rowNum))
			continue
		}

		err = database.CreateStudent(models.CreateStudentParams{
			CWID:    cwid,
			User_ID: userID,
			Name:    name,
		})
		if err != nil {
			if strings.Contains(err.Error(), "UNIQUE") || strings.Contains(err.Error(), "constraint") {
				result.Skipped++
			} else {
				result.Errors = append(result.Errors, fmt.Sprintf("row %d (%s): %s", rowNum, cwid, err.Error()))
			}
			continue
		}
		result.Created++
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
