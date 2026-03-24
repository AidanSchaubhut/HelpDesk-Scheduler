package database	

import (
	"database/sql"
	"embed"
	"log"

	_ "modernc.org/sqlite"
)

var DB *sql.DB

//go:embed schema.sql
var schemaFS embed.FS

func InitDB(path string) {
	var err error
	// _pragma=foreign_keys(1) ensures foreign keys are enabled on every connection
	DB, err = sql.Open("sqlite", path+"?_pragma=foreign_keys(1)")
	if err != nil {
		log.Fatal(err)
	}

	// SQLite only supports one writer — limit to a single connection
	// to avoid "database is locked" errors and ensure the pragma sticks
	DB.SetMaxOpenConns(1)

	createTables()
	runMigrations()
}

func runMigrations() {
	// Add columns if they don't exist (for existing databases)
	_, _ = DB.Exec("ALTER TABLE time_off_requests ADD COLUMN effective_date TEXT")
	_, _ = DB.Exec("ALTER TABLE time_off_requests ADD COLUMN reason TEXT")
	_, _ = DB.Exec("ALTER TABLE teams ADD COLUMN kace_queue_user TEXT NOT NULL DEFAULT ''")

	// Create timeclock_requests table if it doesn't exist (for existing databases)
	_, _ = DB.Exec(`CREATE TABLE IF NOT EXISTS timeclock_requests (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		cwid TEXT NOT NULL REFERENCES students(cwid) ON DELETE CASCADE,
		shift_date TEXT NOT NULL,
		start_time TEXT NOT NULL,
		end_time TEXT NOT NULL,
		reason TEXT NOT NULL,
		status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fixed')),
		admin_notes TEXT NOT NULL DEFAULT '',
		resolved_by TEXT,
		resolved_at TEXT,
		created_at TEXT NOT NULL DEFAULT (datetime('now'))
	)`)

	// Clean up expired date-specific time-off requests
	result, err := DB.Exec("DELETE FROM time_off_requests WHERE effective_date IS NOT NULL AND effective_date < date('now')")
	if err != nil {
		log.Printf("Warning: failed to clean up expired time-off requests: %v", err)
	} else if n, _ := result.RowsAffected(); n > 0 {
		log.Printf("Cleaned up %d expired time-off requests", n)
	}
}

func createTables(){
	schema, err := schemaFS.ReadFile("schema.sql")
	if err != nil {
		log.Fatal("Failed to read schema: ", err)
	}
	_, err = DB.Exec(string(schema))
	if err != nil {
		log.Fatal("Failed to create tables: ", err)
	}
}