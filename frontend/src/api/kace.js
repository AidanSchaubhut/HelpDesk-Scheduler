/**
 * KACE Ticket Integration
 *
 * Single endpoint that returns per-student and per-team ticket counts
 * for students scheduled today.
 *
 * Response shape:
 *   { students: { [cwid]: number }, teams: { [teamId]: number } }
 */

const API_BASE = "/api";

export async function getKACETickets() {
  const token = localStorage.getItem("token");
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/kace/tickets`, { headers });

  if (!res.ok) {
    console.warn("KACE ticket fetch failed:", res.status);
    return { students: {}, teams: {} };
  }

  return res.json();
}
