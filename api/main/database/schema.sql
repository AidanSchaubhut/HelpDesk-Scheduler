-- Core tables

  CREATE TABLE IF NOT EXISTS students (
      cwid TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      user_id TEXT NOT NULL,                                                                                                     
      role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin'))
  );  

  CREATE TABLE IF NOT EXISTS badges (                                                                                                       
      id TEXT PRIMARY KEY CHECK (id GLOB '[a-z0-9_]*'),
      name TEXT NOT NULL,                                                                                                     
      icon TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS student_badges (                                                                                               
      cwid TEXT NOT NULL REFERENCES students(cwid) ON DELETE CASCADE,
      badge_id TEXT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,                                                         
      PRIMARY KEY (cwid, badge_id)
  );

  CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY CHECK (id GLOB '[a-z0-9_]*'),
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      max_per_slot INTEGER NOT NULL DEFAULT 3,
      kace_queue_user TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS assignments (
      cwid TEXT NOT NULL REFERENCES students(cwid) ON DELETE CASCADE,
      team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      PRIMARY KEY (cwid, team_id)
  );

  -- Schedule

  CREATE TABLE IF NOT EXISTS schedule (
      cwid TEXT NOT NULL REFERENCES students(cwid) ON DELETE CASCADE,
      team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      day TEXT NOT NULL CHECK (day IN ('Monday','Tuesday','Wednesday','Thursday','Friday')),
      slot TEXT NOT NULL,
      PRIMARY KEY (cwid, team_id, day, slot),
      FOREIGN KEY (cwid, team_id) REFERENCES assignments(cwid, team_id) ON DELETE CASCADE
  );

  -- Time off

  CREATE TABLE IF NOT EXISTS time_off_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cwid TEXT NOT NULL REFERENCES students(cwid) ON DELETE CASCADE,
      day TEXT NOT NULL CHECK (day IN ('Monday','Tuesday','Wednesday','Thursday','Friday')),
      slot TEXT,  -- NULL means full day
      effective_date TEXT,  -- NULL means recurring every week; YYYY-MM-DD means one-time
      reason TEXT,  -- optional reason for the request
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- Schedule lock (single-row table)

  CREATE TABLE IF NOT EXISTS schedule_lock (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      locked BOOLEAN NOT NULL DEFAULT 0
  );

  INSERT OR IGNORE INTO schedule_lock (id, locked) VALUES (1, 0);

  -- Timeclock correction requests

  CREATE TABLE IF NOT EXISTS timeclock_requests (
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
  );