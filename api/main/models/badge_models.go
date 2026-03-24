package models


type Badge struct {
	ID		string	`json:"id"`
	Name	string	`json:"name"`
	Icon	string	`json:"icon"`
}

type UpdateBadgeParams struct {
	Name	*string	`json:"name"`
	Icon	*string	`json:"icon"`
}

type StudentBadge struct {
	CWID    string `json:"cwid"`
	BadgeID string `json:"badge_id"`
}

type StudentBadgeDetail struct {
	CWID      string `json:"cwid"`
	BadgeID   string `json:"badge_id"`
	BadgeName string `json:"badge_name"`
	BadgeIcon string `json:"badge_icon"`
}