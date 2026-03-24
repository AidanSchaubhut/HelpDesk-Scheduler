# Help Desk Scheduler — Feature Documentation

A self-hosted shift scheduling tool for the Louisiana Tech IT Help Desk. Replaces the manual Google Sheets sign-up process with an authenticated, capacity-enforced web application.

---

## Problem Statement

The existing workflow uses a shared Google Sheet where student workers type their names into cells to claim shifts. A second sheet must be manually maintained so a locally hosted site can display the schedule. This creates three issues:

1. **No access control** — anyone can overwrite anyone else's row in the shared sheet.
2. **Manual syncing** — schedule data must be copied between two separate sheets by hand.
3. **No capacity enforcement** — there's no mechanism to prevent overstaffing a slot.

The scheduler solves all three by combining sign-up and display into a single application with CWID-based authentication and real-time capacity limits.

---

## Authentication

Students sign in using their Campus Wide ID (CWID). The login screen validates the CWID against the student roster before granting access. This ensures every schedule modification is tied to a specific individual — no one can accidentally or intentionally alter another student's shifts.

Admins are identified by a `role` field on their student record. Admin accounts see an additional "Admin Panel" tab in the navigation bar. Non-admin users cannot access administrative functions.

---

## Sign-Up View

The primary interface for student workers. After logging in, students see a grid of time slots (8:00 AM – 5:00 PM in 30-minute increments) across all teams for the selected day of the week.

### Shift Selection

Each cell in the grid is a toggle button. Clicking it signs the student up for that slot; clicking again removes them. The button reflects the current state:

- **Available** — shows capacity dots and a count (e.g., `●●○ 2/3`), indicating how many of the max slots are filled.
- **Signed Up** — highlighted in the team's color with a checkmark.
- **Full** — grayed out with a lock icon. Disabled unless the student is already signed up (in which case they can remove themselves).

### Team Restriction

Students can only sign up for teams they've been assigned to by an admin. Unassigned teams appear in the grid but are visually dimmed and labeled "(view only)" — students can see who's working but cannot interact with those slots.

If a student has no team assignments at all, a yellow warning banner appears directing them to contact an admin.

### Shift Summary Bar

When a student has shifts on the selected day, a summary bar appears at the top showing colored tags for each shift (e.g., `9:00 - 9:30 · Customer`). This gives a quick at-a-glance view of the day's commitments.

### Expanded Slot Detail

Clicking any time slot label expands a detail row showing the names of all students currently signed up for that slot, broken out by team. This helps students coordinate coverage before committing.

### Autofill from Previous Day

A "Copy shifts from" toolbar lets students replicate their schedule from one day to another. The workflow:

1. Select a source day from the dropdown. Days with no shifts are disabled. The dropdown shows the shift count for each day (e.g., "Monday (5 shifts)").
2. Click "Apply to [target day]."
3. A confirmation banner appears warning that full slots will be skipped.
4. On confirmation, the system copies all shifts from the source day to the target day, respecting capacity limits.

Feedback is provided via toast notifications:
- `Copied 4 shifts from Monday` — all shifts transferred.
- `Copied 3, 1 skipped (full)` — partial success.
- `All 2 skipped — slots full` — no shifts could be copied.
- `No shifts on Tuesday` — source day was empty.

### Lock Schedule

The admins should be able to lock the schedule from changes once the quarter has started. 

---

## Schedule View

A read-only display of the full schedule for the selected day, designed to match the format the existing local site expects. Shows all teams in a table layout with:

- Student names rendered as colored tags under each team column.
- Students should also have an icon in their card if they are part of the AWS team or if they are certified to drive the cart. (These should be configurable in the **Admin Panel**)
- A capacity indicator (e.g., `👥 2/3`) on the right side of each cell, color-coded: green when full, amber when partially filled, gray when empty.
- Each student will have a number of active tickets under their name
- Each team will have a display of the tickets that are associated with that team.
    - Ex: Student A has 3 tickets, Student B has 1 ticket, and there are 8 in that team's queue, then there are 12 tickets total displayed next to the team name. 

This view is accessible to all users (students and admins) and serves as the replacement for the manually maintained display sheet.

---

## Time Off Request

A form that a student would fill out in order to request time off. This request can be made for either the entire day or for certain 30-minute blocks of their shift. 

Once the request is put in, their name tag in the Schedule View will automaticlly turn grey for the times that they have requested off. 

---

## Admin Panel

Accessible only to users with the `admin` role. Contains three tabs for managing the system's core data.

### Students Tab

A searchable, sortable table of all student workers in the system.

**Displayed fields:**
- Name (with avatar initial)
- CWID (monospaced for readability)
- Role (admin or student, shown as a badge)
- Teams (colored tags for each assigned team, or "Unassigned" if none)

**Actions:**
- **Add Student** — opens an inline form to enter a name and CWID. Validates for duplicate CWIDs.
- **Toggle Role** — the shield button promotes a student to admin or demotes an admin to student.
- **Remove Student** — deletes the student from the system. This cascades: removes all team assignments and all schedule entries for that student.

**Search** — filters the table by name or CWID in real time.

### Teams Tab

A card-based view of all teams in the system.

**Each card shows:**
- Team name and ID
- Member count (number of students assigned to the team)
- Max per slot (adjustable with +/− buttons)

**Actions:**
- **Add Team** — creates a new team with a custom name, short ID (used internally), and default capacity. The ID must be unique and is restricted to lowercase alphanumeric characters and underscores.
- **Adjust Capacity** — the +/− buttons change the maximum number of students allowed per 30-minute slot for that team. Changes take effect immediately across the sign-up grid.
- **Delete Team** — removes the team entirely. This cascades: unassigns all students from the team and removes all schedule entries associated with it.

New teams automatically receive a color from a rotating palette for visual distinction.

### Assignments Tab

A matrix-style interface for assigning students to teams. Each row is a student; each column is a team. The intersection is a toggle button:

- **Checkmark (colored)** — student is assigned to this team. Clicking removes the assignment.
- **Plus (gray)** — student is not assigned. Clicking adds the assignment.

**Cascading behavior on unassignment:** When a student is removed from a team, all of their existing schedule entries for that team are automatically deleted. This prevents orphaned shifts where a student appears on a schedule for a team they no longer belong to.

**Filtering options:**
- Search by name or CWID
- Filter dropdown: All Students, Unassigned only (with count), or by specific team

---

## Data Architecture

The data should be stored in a SQLite database.

## Production Considerations

This prototype runs entirely client-side. To deploy as a real tool, the following additions would be needed:

- **Backend API** — a Go service handling CRUD operations with proper authentication. JWT-based auth using CWID would align with the existing MES capstone architecture.
- **Database** — PostgreSQL for persistent storage of students, teams, assignments, and schedule data.
- **Integration** — the existing local display site could consume schedule data from the same database, eliminating the manual sync step entirely.
- **Validation** — server-side enforcement of capacity limits and team assignments to prevent race conditions.
- **Audit logging** — track who changed what and when for accountability.
