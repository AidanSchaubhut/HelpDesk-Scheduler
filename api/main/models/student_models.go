package models

type Student struct {
	CWID	string	`json:"cwid"`
	User_ID string	`json:"user_id"`
	Name	string	`json:"name"`
	Role	string	`json:"role"`
}

type CreateStudentParams struct {
	CWID	string `json:"cwid"`
    User_ID string `json:"user_id"`
    Name    string `json:"name"`
}
