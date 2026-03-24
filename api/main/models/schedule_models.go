package models

type ScheduleEntry struct {
	CWID        string `json:"cwid"`
	TeamID      string `json:"team_id"`
	Day         string `json:"day"`
	Slot        string `json:"slot"`
	StudentName string `json:"student_name"`
}

type AutofillResult struct {
	Added   int `json:"added"`
	Skipped int `json:"skipped"`
}
