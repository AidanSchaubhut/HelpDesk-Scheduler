package models

type Team struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	Color         string `json:"color"`
	Max_per_slot  int64  `json:"max_per_slot"`
	KaceQueueUser string `json:"kace_queue_user"`
}

type CreateTeamParams struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Color string `json:"color"`
}

type UpdateTeamParams struct {
	Name          *string `json:"name"`
	Color         *string `json:"color"`
	Max_per_slot  *int64  `json:"max_per_slot"`
	KaceQueueUser *string `json:"kace_queue_user"`
}
