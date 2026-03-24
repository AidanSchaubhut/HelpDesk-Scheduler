package models

type TimeOffRequest struct {
	ID            int    `json:"id"`
	CWID          string `json:"cwid"`
	Day           string `json:"day"`
	Slot          string `json:"slot"`
	EffectiveDate string `json:"effective_date"`
	Reason        string `json:"reason"`
	CreatedAt     string `json:"created_at"`
}

type TimeOffRequestDetail struct {
	ID            int    `json:"id"`
	CWID          string `json:"cwid"`
	StudentName   string `json:"student_name"`
	Day           string `json:"day"`
	Slot          string `json:"slot"`
	EffectiveDate string `json:"effective_date"`
	Reason        string `json:"reason"`
	CreatedAt     string `json:"created_at"`
}

type CreateTimeOffParams struct {
	CWID          string  `json:"cwid"`
	Day           string  `json:"day"`
	Slot          *string `json:"slot"`
	EffectiveDate *string `json:"effective_date"`
	Reason        *string `json:"reason"`
}
