package models

type TimeOffRequest struct {
	ID            int     `json:"id"`
	CWID          string  `json:"cwid"`
	Day           string  `json:"day"`
	Slot          string  `json:"slot"`
	EffectiveDate string  `json:"effective_date"`
	Reason        string  `json:"reason"`
	Status        string  `json:"status"`
	ReviewedBy    *string `json:"reviewed_by"`
	ReviewedAt    *string `json:"reviewed_at"`
	CreatedAt     string  `json:"created_at"`
}

type TimeOffRequestDetail struct {
	ID            int     `json:"id"`
	CWID          string  `json:"cwid"`
	StudentName   string  `json:"student_name"`
	Day           string  `json:"day"`
	Slot          string  `json:"slot"`
	EffectiveDate string  `json:"effective_date"`
	Reason        string  `json:"reason"`
	Status        string  `json:"status"`
	ReviewedBy    *string `json:"reviewed_by"`
	ReviewedAt    *string `json:"reviewed_at"`
	CreatedAt     string  `json:"created_at"`
}

type CreateTimeOffParams struct {
	CWID          string  `json:"cwid"`
	Day           string  `json:"day"`
	Slot          *string `json:"slot"`
	EffectiveDate *string `json:"effective_date"`
	Reason        *string `json:"reason"`
}

type UpdateTimeOffStatusParams struct {
	Status string  `json:"status"`
	Reason *string `json:"reason"`
}

type StudentAbsenceCount struct {
	CWID        string `json:"cwid"`
	StudentName string `json:"student_name"`
	Excused     int    `json:"excused"`
	Unexcused   int    `json:"unexcused"`
	Pending     int    `json:"pending"`
	Total       int    `json:"total"`
}
