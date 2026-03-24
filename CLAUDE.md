# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Shift scheduling web app for the Louisiana Tech University IT Help Desk. Replaces a manual Google Sheets process with an authenticated, capacity-enforced application. Students sign in via CWID (Campus Wide ID) to claim 30-minute time slots across teams (Customer Support, Client Support, Call Center).

## Build & Run

### Backend (Go + SQLite)
```bash
cd api/main
go build -o server .
./server                    # runs on http://127.0.0.1:8080
```
The server auto-creates `helpdesk.db` on first run and runs schema migrations on startup.

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev                 # dev server with API proxy to :8080
npm run build               # production build to dist/
```
Vite proxies `/api` requests to the Go backend (configured in `vite.config.js`).

## Architecture

### Backend — `api/main/`
- **Go + Chi router** with JWT auth middleware. SQLite database via `modernc.org/sqlite`.
- `routes.go` — all route registration. Uses `auth.AuthMiddleware` for authenticated routes and `auth.AdminOnly` for admin routes.
- `database/` — one file per domain (students, teams, schedule, assignments, badges, time_off, schedule_lock). Schema in `database/schema.sql`, migrations in `database/db.go`.
- `handlers/` — HTTP handlers, one file per domain. Decode JSON, validate, call database layer, return response.
- `models/` — request/response structs with JSON tags.
- **Important routing pattern**: Chi's `r.Route()` subrouters take ownership of path prefixes and shadow sibling routes. When admin routes share a prefix with authenticated routes (e.g., `/teams`, `/badges`, `/time-off`), register admin routes individually (`r.Get`, `r.Post`, etc.) instead of using `r.Route()`.

### Frontend — `frontend/src/`
- **React 19 + Vite**. Inline styles (no CSS framework), matching the design system from `styling_example_helpdesk-scheduler.jsx`.
- `api/client.js` — centralized API client with JWT auth headers and auto-logout on 401.
- `api/kace.js` — **stub** for KACE ticket integration. Returns empty data; replace with real API calls when ready.
- `context/AuthContext.jsx` — auth state (user, token, isAdmin) with localStorage persistence.
- `styles/theme.js` — shared constants: `DAYS`, `TIME_SLOTS`, `teamColors()`, `getCurrentDay()`, `slotToMinutes()`.
- `components/` — Nav (tab routing), DaySelector (Mon–Fri bar), Icons (SVG components), Toast (notifications).

### Frontend Pages
- **SignUpPage** — shift sign-up grid with capacity toggles, autofill, weekly hours count, clear schedule button. Uses day selector.
- **SchedulePage** — read-only weekly schedule grid with badges. Uses day selector. No time-off or live features.
- **TodayPage** — live view locked to today's date. Has red time indicator line, time-off graying/strikethrough, and KACE ticket counts (stubbed). No day selector.
- **TimeOffPage** — request form with recurring (weekly) or specific-date mode, required reason field, slot or full-day selection.
- **AdminPage** — 5 tabs: Students, Teams, Assignments, Badges, Time Off. Plus schedule lock toggle and clear-all-schedule button.
- **LoginPage** — CWID-based login.

## Key Domain Concepts

- **CWID** — 8-digit Campus Wide ID, primary user identifier
- **Team** — work group (e.g., Customer Support); each has a color and per-slot capacity (default 3)
- **Slot** — 30-minute time block (8:00 AM–4:30 PM); schedule key is `day|slot|team|cwid`
- **Time Off** — recurring (every week on a day) or date-specific (one-time, auto-deleted after the date passes). Requires a reason.
- **Badges** — configurable icons (emoji) assigned to students, displayed on schedule views
- **Cascade behavior** — removing a student from a team deletes their schedule entries for that team; deleting a team/student cascades to assignments and schedule

## Known Patterns & Pitfalls

- **SQLite single-writer**: concurrent writes cause "database is locked". Use sequential `for...of` loops (not `Promise.all`) for multiple write requests from the frontend.
- **JWT secret regenerates on server restart**, invalidating stored tokens. The API client handles this by auto-clearing tokens and reloading on 401.
- **`json:"omitempty"` on strings** in Go models causes empty strings to be omitted from JSON (`undefined` in JS instead of `""`). Use `COALESCE(col, '')` in SQL queries and falsy checks (`!value`) in JS.
- **Chi route shadowing**: see routing pattern note above.
