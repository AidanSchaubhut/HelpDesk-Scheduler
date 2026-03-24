package models

type TimeclockRequest struct {
	ID         int64  `json:"id"`
	CWID       string `json:"cwid"`
	ShiftDate  string `json:"shift_date"`
	StartTime  string `json:"start_time"`
	EndTime    string `json:"end_time"`
	Reason     string `json:"reason"`
	Status     string `json:"status"`
	AdminNotes string `json:"admin_notes"`
	ResolvedBy string `json:"resolved_by"`
	ResolvedAt string `json:"resolved_at"`
	CreatedAt  string `json:"created_at"`
}

type TimeclockRequestDetail struct {
	TimeclockRequest
	StudentName string `json:"student_name"`
}

type CreateTimeclockParams struct {
	CWID      string `json:"cwid"`
	ShiftDate string `json:"shift_date"`
	StartTime string `json:"start_time"`
	EndTime   string `json:"end_time"`
	Reason    string `json:"reason"`
}

type ResolveTimeclockParams struct {
	AdminNotes string `json:"admin_notes"`
}
