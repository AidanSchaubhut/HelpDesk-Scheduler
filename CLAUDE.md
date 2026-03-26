# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Shift scheduling web app for the Louisiana Tech University IT Help Desk. Replaces a manual Google Sheets process with an authenticated, capacity-enforced application. Students sign in via CWID (Campus Wide ID) + Campus PIN to claim 30-minute time slots across teams (Customer Support, Client Support, Call Center).

## Build & Run

### Backend (Go + SQLite)
```bash
cd api/main
go build -o server .
./server                    # runs on http://0.0.0.0:80 (or PORT env var)
```
Go module name is `helpdesk-scheduler` (used in all internal imports). The server auto-creates `helpdesk.db` on first run, runs schema migrations, and seeds a default admin account (CWID: `00000000`, PIN: `1234`).

For local development, set `PORT=8080` in `api/main/.env` so it matches the Vite proxy.

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev                 # dev server with API proxy to :8080
npm run build               # production build to dist/
npm run lint                # ESLint (flat config in eslint.config.js)
```
Vite proxies `/api` requests to the Go backend (configured in `vite.config.js`).

### Production
In production, the Go server serves the built frontend from disk. It checks `./dist` then `../../frontend/dist` (repo layout). No separate frontend process needed — just `npm run build` and run the Go binary.

### Testing
No test framework is configured for either backend or frontend.

### Environment Variables
Backend reads `api/main/.env` on startup (see `.env.example`). Keys:
- `PORT` — server port (default: `80`, use `8080` for local dev)
- `KACE_HOST`, `KACE_USERNAME`, `KACE_PASSWORD` — KACE ticket integration (currently stubbed)

## Architecture

### Backend — `api/main/`
- **Go + Chi router** with JWT auth middleware. SQLite database via `modernc.org/sqlite`. Bcrypt PIN hashing via `golang.org/x/crypto`.
- `main.go` — server entry point, `.env` loading, static file serving with SPA fallback.
- `routes.go` — all route registration. Uses `auth.AuthMiddleware` for authenticated routes and `auth.AdminOnly` for admin routes.
- `auth/jwt.go` — JWT generation/validation, context helpers `GetCWID(r)` and `GetRole(r)` using typed context keys. **Always use `auth.GetCWID(r)` — never `r.Context().Value("cwid")` directly** (typed key mismatch will panic).
- `database/` — one file per domain. Schema in `database/schema.sql` (embedded via `//go:embed`), migrations in `database/db.go`.
- `handlers/` — HTTP handlers, one file per domain. Decode JSON, validate, call database layer, return response.
- `models/` — request/response structs with JSON tags.
- **Important routing pattern**: Chi's `r.Route()` subrouters take ownership of path prefixes and shadow sibling routes. When admin routes share a prefix with authenticated routes (e.g., `/teams`, `/badges`, `/time-off`), register admin routes individually (`r.Get`, `r.Post`, etc.) instead of using `r.Route()`.

### Frontend — `frontend/src/`
- **React 19 + Vite**. Inline styles (no CSS framework).
- `api/client.js` — centralized API client with JWT auth headers and auto-logout on 401. Error objects have `.status` and `.message` (response body text).
- `api/kace.js` — **stub** for KACE ticket integration. Returns empty data; replace with real API calls when ready.
- `context/AuthContext.jsx` — auth state (user, token, isAdmin) with localStorage persistence.
- `styles/theme.js` — shared constants: `DAYS`, `TIME_SLOTS`, `teamColors()`, `getCurrentDay()`, `slotToMinutes()`, `buildTeamHoursMap()`, `getVisibleSlots()`, `isSlotActiveForTeam()`.
- `components/` — Nav (tab routing), DaySelector (Mon–Fri bar), Icons (SVG components), Toast (notifications).

### Frontend Pages
- **LoginPage** — CWID + Campus PIN login (PIN field is `type="password"`).
- **SignUpPage** — shift sign-up grid with capacity toggles, autofill, weekly hours count, clear schedule button.
- **SchedulePage** — read-only weekly schedule grid with badges.
- **TodayPage** — live view locked to today. Red time indicator line (updates every 30s), time-off graying/strikethrough, "Here Now" roster bar per team, KACE ticket counts (stubbed). Auto-refreshes schedule data every 60 seconds.
- **TimeOffPage** — request form (recurring or date-specific), slot or full-day selection, required reason. Shows student's attendance points summary and time-off status counts (pending/excused/unexcused).
- **TimeclockPage** — timeclock correction request form.
- **AdminPage** — 7 tabs: Students, Teams, Assignments, Badges, Time Off, Time Clock, Attendance. Plus schedule lock toggle and clear-all-schedule button (also clears time-off requests and attendance points).

### Database Domains
Each domain has its own `database/*.go`, `handlers/*_handler.go`, and `models/*_models.go` files:
- **students** — CWID, name, user_id, pin_hash, role (student/admin)
- **teams** — name, color, max_per_slot capacity, kace_queue_user
- **assignments** — student-to-team junction table
- **schedule** — day/slot/team/cwid entries
- **badges** — configurable emoji icons assigned to students
- **time_off** — recurring or date-specific requests with status (pending/excused/unexcused), reviewed_by, reviewed_at
- **attendance_points** — point values with freeform reason, tracks who assigned them
- **timeclock** — correction requests with pending/fixed status and admin resolution
- **team_hours** — per-team, per-day operating hours
- **schedule_lock** — single-row config table for freeze/unfreeze

## Key Domain Concepts

- **CWID** — 8-digit Campus Wide ID, primary user identifier
- **Campus PIN** — bcrypt-hashed password stored in `pin_hash` column. Required for login.
- **Team** — work group with color and per-slot capacity (default 3)
- **Slot** — 30-minute time block (8:00 AM–4:30 PM); schedule key is `day|slot|team|cwid`
- **Time Off** — recurring (every week on a day) or date-specific (one-time, auto-deleted after date passes). Has excused/unexcused/pending status. Multi-slot requests are stored as individual rows but grouped in the UI by cwid+day+date+reason.
- **Attendance Points** — progressive discipline system: 0.5 (tardy), 1 (absence), 3 (no-show). Thresholds: 3=Verbal Reminder, 5=Written Warning, 7=Final Warning, 10=Termination. Points reset with "Clear Schedule".
- **Cascade behavior** — removing a student from a team deletes their schedule entries for that team; deleting a student cascades to assignments, schedule, time-off, and attendance points.

## Known Patterns & Pitfalls

- **SQLite single-writer**: concurrent writes cause "database is locked". The DB is opened with `SetMaxOpenConns(1)`. Use sequential `for...of` loops (not `Promise.all`) for multiple write requests from the frontend.
- **JWT secret regenerates on server restart**, invalidating stored tokens. The API client handles this by auto-clearing tokens and reloading on 401.
- **`json:"omitempty"` on strings** in Go models causes empty strings to be omitted from JSON (`undefined` in JS instead of `""`). Use `COALESCE(col, '')` in SQL queries and falsy checks (`!value`) in JS.
- **Chi route shadowing**: see routing pattern note above.
- **Auth context keys**: Always use `auth.GetCWID(r)` / `auth.GetRole(r)`, never raw `r.Context().Value("cwid")` — the keys are typed `contextKey` not plain strings.
- **ESLint `no-unused-vars`** is configured to ignore variables starting with uppercase or `_` (`varsIgnorePattern: '^[A-Z_]'`, `argsIgnorePattern: '^_'`).
- **Frontend routing** is manual view-state in `App.jsx` (not file-based). `react-router-dom` is installed but navigation is driven by the `Nav` component setting a `currentView` state.
- **Schema migrations** are idempotent `ALTER TABLE` / `CREATE TABLE IF NOT EXISTS` statements in `database/db.go` (no version tracking). Expired date-specific time-off requests are auto-cleaned on startup.
- **Time-off grouping**: Multi-slot requests are stored as individual DB rows (one per slot) for per-slot lookup on TodayPage. The admin and student UIs group them by cwid+day+date+reason for display. Status changes and deletes operate on all rows in a group sequentially.
- **PIN management**: Students without a `pin_hash` cannot log in. Admins set PINs via the lock icon in the Students tab or during CSV import (optional `pin` column). Default admin account is seeded on first run.
