package database

// KACETicketRow represents a row from the kace_tickets table.
type KACETicketRow struct {
	Username    string
	CWID        string
	TeamID      string
	TicketCount int
}

// UpsertKACETicketCount inserts or updates a single username's ticket count.
func UpsertKACETicketCount(username, cwid, teamID string, count int) error {
	_, err := DB.Exec(`
		INSERT INTO kace_tickets (username, cwid, team_id, ticket_count, updated_at)
		VALUES (?, ?, ?, ?, datetime('now'))
		ON CONFLICT(username) DO UPDATE SET
			cwid = excluded.cwid,
			team_id = excluded.team_id,
			ticket_count = excluded.ticket_count,
			updated_at = datetime('now')
	`, username, cwid, teamID, count)
	return err
}

// ClearKACETickets removes all rows from the kace_tickets table.
func ClearKACETickets() error {
	_, err := DB.Exec("DELETE FROM kace_tickets")
	return err
}

// GetKACETicketCounts returns all current ticket count rows.
func GetKACETicketCounts() ([]KACETicketRow, error) {
	rows, err := DB.Query("SELECT username, cwid, team_id, ticket_count FROM kace_tickets")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []KACETicketRow
	for rows.Next() {
		var r KACETicketRow
		if err := rows.Scan(&r.Username, &r.CWID, &r.TeamID, &r.TicketCount); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, rows.Err()
}
