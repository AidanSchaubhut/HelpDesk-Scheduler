package database	

import (
	"database/sql"
	"embed"
	"log"

	"golang.org/x/crypto/bcrypt"
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
	_, _ = DB.Exec("ALTER TABLE students ADD COLUMN pin_hash TEXT NOT NULL DEFAULT ''")
	_, _ = DB.Exec("ALTER TABLE time_off_requests ADD COLUMN effective_date TEXT")
	_, _ = DB.Exec("ALTER TABLE time_off_requests ADD COLUMN reason TEXT")
	_, _ = DB.Exec("ALTER TABLE time_off_requests ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'")
	_, _ = DB.Exec("ALTER TABLE time_off_requests ADD COLUMN reviewed_by TEXT")
	_, _ = DB.Exec("ALTER TABLE time_off_requests ADD COLUMN reviewed_at TEXT")
	_, _ = DB.Exec("ALTER TABLE teams ADD COLUMN kace_queue_user TEXT NOT NULL DEFAULT ''")

	// Create team_hours table if it doesn't exist (for existing databases)
	_, _ = DB.Exec(`CREATE TABLE IF NOT EXISTS team_hours (
		team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
		day TEXT NOT NULL CHECK (day IN ('Monday','Tuesday','Wednesday','Thursday','Friday')),
		start_time TEXT NOT NULL,
		end_time TEXT NOT NULL,
		PRIMARY KEY (team_id, day)
	)`)

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

	// Create attendance_points table if it doesn't exist (for existing databases)
	_, _ = DB.Exec(`CREATE TABLE IF NOT EXISTS attendance_points (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		cwid TEXT NOT NULL REFERENCES students(cwid) ON DELETE CASCADE,
		points REAL NOT NULL,
		reason TEXT NOT NULL,
		given_by TEXT REFERENCES students(cwid) ON DELETE SET NULL,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	)`)

	// Create kace_tickets table if it doesn't exist (for existing databases)
	_, _ = DB.Exec(`CREATE TABLE IF NOT EXISTS kace_tickets (
		username TEXT PRIMARY KEY,
		cwid TEXT NOT NULL DEFAULT '',
		team_id TEXT NOT NULL DEFAULT '',
		ticket_count INTEGER NOT NULL DEFAULT 0,
		updated_at TEXT NOT NULL DEFAULT (datetime('now'))
	)`)

	// Seed default admin account (CWID: 00000000, PIN: 1234)
	// INSERT OR IGNORE ensures this only runs if the account doesn't already exist
	pinHash, _ := bcrypt.GenerateFromPassword([]byte("1234"), bcrypt.DefaultCost)
	_, _ = DB.Exec(
		`INSERT OR IGNORE INTO students (cwid, name, user_id, pin_hash, role) VALUES (?, ?, ?, ?, ?)`,
		"00000000", "Help Desk", "helpdesk", string(pinHash), "admin",
	)
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