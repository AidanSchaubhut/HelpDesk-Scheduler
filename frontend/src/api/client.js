const API_BASE = "/api";

async function request(method, path, body = null) {
  const token = localStorage.getItem("token");
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (body) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  if (!res.ok) {
    if (res.status === 401 && path !== "/auth/login") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.reload();
      return;
    }
    const text = await res.text();
    const err = new Error(text || res.statusText);
    err.status = res.status;
    throw err;
  }

  if (res.status === 204 || res.headers.get("content-length") === "0") return null;
  const ct = res.headers.get("content-type");
  if (ct && ct.includes("application/json")) return res.json();
  return null;
}

// Auth
export const login = (cwid, pin) => request("POST", "/auth/login", { cwid, pin });

// Students
export const getAllStudents = () => request("GET", "/students");
export const getStudent = (cwid) => request("GET", `/students/${cwid}`);
export const createStudent = (params) => request("POST", "/students", params);
export const updateStudent = (cwid, params) => request("PUT", `/students/${cwid}`, params);
export const deleteStudent = (cwid) => request("DELETE", `/students/${cwid}`);
export const assignStudentRole = (cwid, role) => request("POST", `/students/assign/${cwid}/${role}`);
export const setStudentPin = (cwid, pin) => request("PUT", `/students/${cwid}/pin`, { pin });

export async function importStudents(file) {
  const token = localStorage.getItem("token");
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/students/import`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

// Teams
export const getAllTeams = () => request("GET", "/teams");
export const getTeam = (id) => request("GET", `/teams/${id}`);
export const createTeam = (params) => request("POST", "/teams", params);
export const updateTeam = (id, params) => request("PUT", `/teams/${id}`, params);
export const deleteTeam = (id) => request("DELETE", `/teams/${id}`);

// Assignments
export const getAllAssignments = () => request("GET", "/assignments");
export const getAssignmentsByStudent = (cwid) => request("GET", `/assignments/student/${cwid}`);
export const getAssignmentsByTeam = (teamId) => request("GET", `/assignments/team/${teamId}`);
export const assignStudent = (cwid, teamId) => request("POST", `/assignments/${cwid}/${teamId}`);
export const unassignStudent = (cwid, teamId) => request("DELETE", `/assignments/${cwid}/${teamId}`);

// Schedule
export const getScheduleByDay = (day) => request("GET", `/schedule/${day}`);
export const getScheduleByStudent = (day, cwid) => request("GET", `/schedule/${day}/${cwid}`);
export const signUpForSlot = (params) => request("POST", "/schedule/signup", params);
export const removeFromSlot = (params) => request("DELETE", "/schedule/remove", params);
export const autofillFromDay = (params) => request("POST", "/schedule/autofill", params);
export const getScheduleLock = () => request("GET", "/schedule/lock");
export const setScheduleLock = (locked) => request("PUT", "/schedule/lock", { locked });
export const clearAllSchedule = () => request("DELETE", "/schedule/clear");
export const getStudentSlotCounts = () => request("GET", "/schedule/slot-counts");

export async function exportScheduleCSV() {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}/schedule/export-csv`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to export schedule");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "schedule_export.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// Time Off
export const createTimeOffRequest = (params) => request("POST", "/time-off", params);
export const getTimeOffByStudent = (cwid) => request("GET", `/time-off/student/${cwid}`);
export const getTimeOffByDay = (day) => request("GET", `/time-off/day/${day}`);
export const deleteTimeOffRequest = (id) => request("DELETE", `/time-off/${id}`);
export const getAllTimeOffRequests = () => request("GET", "/time-off/all");
export const adminDeleteTimeOffRequest = (id) => request("DELETE", `/time-off/admin/${id}`);
export const updateTimeOffStatus = (id, status) => request("POST", `/time-off/admin/${id}/status`, { status });
export const getAbsenceCounts = () => request("GET", "/time-off/admin/absences");

// Attendance Points
export const getMyPoints = () => request("GET", "/attendance-points/me");
export const createAttendancePoint = (params) => request("POST", "/attendance-points", params);
export const getAllAttendancePoints = () => request("GET", "/attendance-points/all");
export const getPointsSummary = () => request("GET", "/attendance-points/summary");
export const deleteAttendancePoint = (id) => request("DELETE", `/attendance-points/${id}`);
export const clearAllAttendancePoints = () => request("DELETE", "/attendance-points/clear");

// Team Hours
export const getAllTeamHours = () => request("GET", "/team-hours");
export const setTeamHours = (teamId, entries) => request("PUT", `/team-hours/${teamId}`, entries);

// Timeclock Corrections
export const createTimeclockRequest = (params) => request("POST", "/timeclock", params);
export const getTimeclockByStudent = (cwid) => request("GET", `/timeclock/student/${cwid}`);
export const getAllTimeclockRequests = () => request("GET", "/timeclock/all");
export const resolveTimeclockRequest = (id, params) => request("PUT", `/timeclock/${id}/resolve`, params);

// Badges
export const getAllStudentBadges = () => request("GET", "/badges/student-badges");
export const getAllBadges = () => request("GET", "/badges");
export const getBadge = (id) => request("GET", `/badges/${id}`);
export const createBadge = (params) => request("POST", "/badges", params);
export const updateBadge = (id, params) => request("PUT", `/badges/${id}`, params);
export const deleteBadge = (id) => request("DELETE", `/badges/${id}`);
export const assignBadge = (cwid, badgeId) => request("POST", `/badges/assign/${cwid}/${badgeId}`);
export const revokeBadge = (cwid, badgeId) => request("DELETE", `/badges/revoke/${cwid}/${badgeId}`);
