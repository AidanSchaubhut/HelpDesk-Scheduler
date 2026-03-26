package models

type AttendancePoint struct {
	ID        int     `json:"id"`
	CWID      string  `json:"cwid"`
	Points    float64 `json:"points"`
	Reason    string  `json:"reason"`
	GivenBy   *string `json:"given_by"`
	CreatedAt string  `json:"created_at"`
}

type AttendancePointDetail struct {
	ID          int     `json:"id"`
	CWID        string  `json:"cwid"`
	StudentName string  `json:"student_name"`
	Points      float64 `json:"points"`
	Reason      string  `json:"reason"`
	GivenBy     *string `json:"given_by"`
	GivenByName *string `json:"given_by_name"`
	CreatedAt   string  `json:"created_at"`
}

type CreateAttendancePointParams struct {
	CWID   string  `json:"cwid"`
	Points float64 `json:"points"`
	Reason string  `json:"reason"`
}

type StudentPointsSummary struct {
	CWID            string  `json:"cwid"`
	StudentName     string  `json:"student_name"`
	TotalPoints     float64 `json:"total_points"`
	DisciplineLevel string  `json:"discipline_level"`
}

type MyPointsResponse struct {
	TotalPoints     float64           `json:"total_points"`
	DisciplineLevel string            `json:"discipline_level"`
	History         []AttendancePoint `json:"history"`
}
