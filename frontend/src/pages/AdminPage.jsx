import { useState, useEffect, useMemo, useCallback } from "react";
import { Icons } from "../components/Icons";
import { teamColors } from "../styles/theme";
import { useAuth } from "../context/AuthContext";
import {
  getAllStudents,
  createStudent,
  deleteStudent,
  assignStudentRole,
  importStudents,
  getAllTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  getAllAssignments,
  assignStudent,
  unassignStudent,
  getAllBadges,
  createBadge,
  updateBadge,
  deleteBadge,
  assignBadge,
  revokeBadge,
  getAllStudentBadges,
  getScheduleLock,
  setScheduleLock,
  clearAllSchedule,
  getAllTimeOffRequests,
  adminDeleteTimeOffRequest,
  getAllTimeclockRequests,
  resolveTimeclockRequest,
} from "../api/client";

export default function AdminPage({ showToast }) {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("students");
  const [loading, setLoading] = useState(true);

  // Data
  const [students, setStudents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [badges, setBadges] = useState([]);
  const [studentBadges, setStudentBadges] = useState([]);
  const [locked, setLocked] = useState(false);
  const [timeOffRequests, setTimeOffRequests] = useState([]);
  const [timeclockRequests, setTimeclockRequests] = useState([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Fetch all data
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [studentsData, teamsData, assignmentsData, badgesData, studentBadgesData, lockData, timeOffData, timeclockData] = await Promise.all([
        getAllStudents(),
        getAllTeams(),
        getAllAssignments(),
        getAllBadges(),
        getAllStudentBadges(),
        getScheduleLock(),
        getAllTimeOffRequests(),
        getAllTimeclockRequests(),
      ]);
      setStudents(studentsData || []);
      setTeams(teamsData || []);
      setAssignments(assignmentsData || []);
      setBadges(badgesData || []);
      setStudentBadges(studentBadgesData || []);
      setLocked(lockData?.locked ?? false);
      setTimeOffRequests(timeOffData || []);
      setTimeclockRequests(timeclockData || []);
    } catch (err) {
      console.error("Failed to load admin data:", err);
      showToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (isAdmin) fetchAll();
  }, [isAdmin, fetchAll]);

  // Schedule lock toggle
  const handleToggleLock = async () => {
    try {
      await setScheduleLock(!locked);
      setLocked(!locked);
      showToast(locked ? "Schedule unlocked" : "Schedule locked", "success");
    } catch (err) {
      showToast("Failed to toggle schedule lock", "error");
    }
  };

  // Clear entire schedule
  const handleClearSchedule = async () => {
    setClearing(true);
    try {
      const result = await clearAllSchedule();
      showToast(`Schedule cleared (${result?.deleted ?? 0} entries removed)`, "success");
      setShowClearConfirm(false);
    } catch (err) {
      showToast("Failed to clear schedule: " + err.message, "error");
    } finally {
      setClearing(false);
    }
  };

  // Access guard
  if (!isAdmin) {
    return (
      <div style={styles.accessDenied}>
        <Icons.Lock />
        <h2 style={{ margin: "12px 0 4px", color: "#0F172A" }}>Access Denied</h2>
        <p style={{ color: "#64748B", fontSize: 14 }}>You must be an admin to view this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.loadingSpinner} />
        <span style={styles.loadingText}>Loading admin panel...</span>
      </div>
    );
  }

  const tabs = [
    { key: "students", label: "Students", icon: <Icons.User /> },
    { key: "teams", label: "Teams", icon: <Icons.Users /> },
    { key: "assignments", label: "Assignments", icon: <Icons.Grid /> },
    { key: "badges", label: "Badges", icon: <Icons.Shield /> },
    { key: "timeoff", label: "Time Off", icon: <Icons.Calendar /> },
    { key: "timeclock", label: "Time Clock", icon: <Icons.Clock /> },
  ];

  return (
    <div style={styles.pageWrap}>
      {/* Tab Bar */}
      <div className="admin-tab-bar" style={styles.tabBar}>
        <div className="admin-tab-group" style={styles.tabGroup}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className="admin-tab"
              onClick={() => setActiveTab(tab.key)}
              style={activeTab === tab.key ? styles.tabActive : styles.tabInactive}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        <div className="admin-actions" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => setShowClearConfirm(true)}
            style={styles.clearBtn}
          >
            <Icons.Trash /> Clear Schedule
          </button>
          <button
            onClick={handleToggleLock}
            style={{
              ...styles.lockBtn,
              background: locked ? "#FEF2F2" : "#F0FDF4",
              color: locked ? "#DC2626" : "#16A34A",
              border: `1px solid ${locked ? "#FECACA" : "#BBF7D0"}`,
            }}
          >
            <Icons.Lock />
            {locked ? "Locked" : "Unlocked"}
          </button>
        </div>
      </div>

      {/* Clear Schedule Confirmation Modal */}
      {showClearConfirm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <div style={{ fontSize: 18, marginBottom: 4 }}><Icons.AlertCircle /></div>
            <h3 style={{ margin: "0 0 8px", fontSize: 16, color: "#0F172A" }}>
              Clear Entire Schedule?
            </h3>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#64748B", lineHeight: 1.5 }}>
              This will remove <strong>all</strong> schedule entries for <strong>every student</strong> across all days and teams. This action cannot be undone. Students will need to sign up again for the new quarter.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowClearConfirm(false)}
                disabled={clearing}
                style={styles.cancelBtn}
              >
                Cancel
              </button>
              <button
                onClick={handleClearSchedule}
                disabled={clearing}
                style={styles.dangerBtn}
              >
                {clearing ? "Clearing..." : "Yes, Clear Everything"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === "students" && (
        <StudentsTab
          students={students}
          teams={teams}
          assignments={assignments}
          badges={badges}
          studentBadges={studentBadges}
          showToast={showToast}
          onRefresh={fetchAll}
        />
      )}
      {activeTab === "teams" && (
        <TeamsTab
          teams={teams}
          assignments={assignments}
          showToast={showToast}
          onRefresh={fetchAll}
        />
      )}
      {activeTab === "assignments" && (
        <AssignmentsTab
          students={students}
          teams={teams}
          assignments={assignments}
          showToast={showToast}
          onRefresh={fetchAll}
        />
      )}
      {activeTab === "badges" && (
        <BadgesTab
          badges={badges}
          studentBadges={studentBadges}
          students={students}
          showToast={showToast}
          onRefresh={fetchAll}
        />
      )}
      {activeTab === "timeoff" && (
        <TimeOffTab
          requests={timeOffRequests}
          showToast={showToast}
          onRefresh={fetchAll}
        />
      )}
      {activeTab === "timeclock" && (
        <TimeclockTab
          requests={timeclockRequests}
          showToast={showToast}
          onRefresh={fetchAll}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Students Tab                                                       */
/* ------------------------------------------------------------------ */
function StudentsTab({ students, teams, assignments, badges, studentBadges, showToast, onRefresh }) {
  const [search, setSearch] = useState("");
  const [formName, setFormName] = useState("");
  const [formCwid, setFormCwid] = useState("");
  const [formUserId, setFormUserId] = useState("");
  const [showForm, setShowForm] = useState(false);

  // Build team map for display
  const teamMap = useMemo(() => {
    const m = {};
    teams.forEach((t, i) => {
      m[t.id] = { ...t, colors: teamColors(t.color, i) };
    });
    return m;
  }, [teams]);

  // Build assignments-by-student
  const studentTeams = useMemo(() => {
    const m = {};
    assignments.forEach((a) => {
      if (!m[a.cwid]) m[a.cwid] = [];
      m[a.cwid].push(a.team_id);
    });
    return m;
  }, [assignments]);

  // Build badges-by-student
  const studentBadgeMap = useMemo(() => {
    const m = {};
    (studentBadges || []).forEach((sb) => {
      if (!m[sb.cwid]) m[sb.cwid] = [];
      m[sb.cwid].push({ id: sb.badge_id, name: sb.badge_name, icon: sb.badge_icon });
    });
    return m;
  }, [studentBadges]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.cwid.toString().includes(q)
    );
  }, [students, search]);

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!formName.trim() || !formCwid.trim() || !formUserId.trim()) {
      showToast("All fields are required", "error");
      return;
    }
    // Check duplicate CWID
    if (students.some((s) => s.cwid.toString() === formCwid.trim())) {
      showToast("A student with that CWID already exists", "error");
      return;
    }
    try {
      await createStudent({ cwid: formCwid.trim(), user_id: formUserId.trim(), name: formName.trim() });
      showToast("Student added", "success");
      setFormName("");
      setFormCwid("");
      setFormUserId("");
      setShowForm(false);
      await onRefresh();
    } catch (err) {
      showToast("Failed to add student: " + err.message, "error");
    }
  };

  const handleDelete = async (cwid, name) => {
    if (!window.confirm(`Delete student "${name}" (${cwid})? This will remove all their assignments and schedule entries.`)) return;
    try {
      await deleteStudent(cwid);
      showToast("Student deleted", "success");
      await onRefresh();
    } catch (err) {
      showToast("Failed to delete student: " + err.message, "error");
    }
  };

  const handleToggleRole = async (cwid, currentRole) => {
    const newRole = currentRole === "admin" ? "student" : "admin";
    try {
      await assignStudentRole(cwid, newRole);
      showToast(`Role updated to ${newRole}`, "success");
      await onRefresh();
    } catch (err) {
      showToast("Failed to update role: " + err.message, "error");
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const result = await importStudents(file);
      const parts = [];
      if (result.created) parts.push(`${result.created} created`);
      if (result.skipped) parts.push(`${result.skipped} skipped (duplicates)`);
      if (result.errors?.length) parts.push(`${result.errors.length} errors`);
      showToast(parts.join(", ") || "No students imported", result.errors?.length ? "error" : "success");
      if (result.errors?.length) console.warn("Import errors:", result.errors);
      await onRefresh();
    } catch (err) {
      showToast("Import failed: " + err.message, "error");
    }
    e.target.value = "";
  };

  return (
    <div>
      {/* Header row */}
      <div className="section-header" style={styles.sectionHeader}>
        <div style={styles.searchWrap}>
          <span style={styles.searchIcon}><Icons.Search /></span>
          <input
            type="text"
            placeholder="Search by name or CWID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <label style={{ ...styles.addBtn, cursor: "pointer" }}>
            <Icons.Plus /> Import CSV
            <input
              type="file"
              accept=".csv"
              onChange={handleImport}
              style={{ display: "none" }}
            />
          </label>
          <button
            onClick={() => setShowForm(!showForm)}
            style={styles.addBtn}
          >
            <Icons.Plus /> Add Student
          </button>
        </div>
      </div>

      {/* Add Student Form */}
      {showForm && (
        <form onSubmit={handleAddStudent} className="admin-form" style={styles.addForm}>
          <input
            type="text"
            placeholder="Full Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            style={styles.formInput}
          />
          <input
            type="text"
            placeholder="CWID (8 digits)"
            value={formCwid}
            onChange={(e) => setFormCwid(e.target.value)}
            style={{ ...styles.formInput, fontFamily: "monospace" }}
            maxLength={8}
          />
          <input
            type="text"
            placeholder="User ID"
            value={formUserId}
            onChange={(e) => setFormUserId(e.target.value)}
            style={styles.formInput}
          />
          <button type="submit" style={styles.submitBtn}>
            <Icons.Check /> Add
          </button>
          <button type="button" onClick={() => setShowForm(false)} style={styles.cancelBtn}>
            Cancel
          </button>
        </form>
      )}

      {/* Table */}
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>CWID</th>
              <th style={styles.th}>Role</th>
              <th style={styles.th}>Teams</th>
              <th style={{ ...styles.th, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={styles.emptyRow}>
                  No students found
                </td>
              </tr>
            ) : (
              filtered.map((student) => {
                const initial = student.name ? student.name.charAt(0).toUpperCase() : "?";
                const myTeams = studentTeams[student.cwid] || [];
                return (
                  <tr key={student.cwid} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.nameCell}>
                        <div style={styles.avatar}>{initial}</div>
                        <div>
                          <span style={styles.nameText}>{student.name}</span>
                          {(studentBadgeMap[student.cwid] || []).length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 3 }}>
                              {studentBadgeMap[student.cwid].map((b) => (
                                <span
                                  key={b.id}
                                  style={styles.badgePill}
                                  title={b.name}
                                >
                                  {b.icon} {b.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.cwid}>{student.cwid}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={student.role === "admin" ? styles.roleAdmin : styles.roleStudent}>
                        {student.role === "admin" ? "Admin" : "Student"}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.teamTags}>
                        {myTeams.map((tid) => {
                          const team = teamMap[tid];
                          if (!team) return null;
                          return (
                            <span
                              key={tid}
                              style={{
                                ...styles.teamTag,
                                background: team.colors.bg,
                                color: team.colors.text,
                                border: `1px solid ${team.colors.border}`,
                              }}
                            >
                              {team.name}
                            </span>
                          );
                        })}
                        {myTeams.length === 0 && (
                          <span style={styles.noTeams}>None</span>
                        )}
                      </div>
                    </td>
                    <td style={{ ...styles.td, textAlign: "right" }}>
                      <div style={styles.actions}>
                        <button
                          onClick={() => handleToggleRole(student.cwid, student.role)}
                          title={student.role === "admin" ? "Demote to student" : "Promote to admin"}
                          style={{
                            ...styles.iconBtn,
                            color: student.role === "admin" ? "#7C3AED" : "#64748B",
                          }}
                        >
                          <Icons.Shield />
                        </button>
                        <button
                          onClick={() => handleDelete(student.cwid, student.name)}
                          title="Delete student"
                          style={{ ...styles.iconBtn, color: "#EF4444" }}
                        >
                          <Icons.Trash />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Teams Tab                                                          */
/* ------------------------------------------------------------------ */
function KaceQueueInput({ teamId, value, onSave, showToast }) {
  const [local, setLocal] = useState(value);
  useEffect(() => { setLocal(value); }, [value]);

  const handleBlur = async () => {
    if (local === value) return;
    try {
      await onSave(local);
    } catch (err) {
      showToast("Failed to update KACE queue user: " + err.message, "error");
      setLocal(value);
    }
  };

  return (
    <input
      type="text"
      placeholder="e.g. ClientSupport"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
      style={{
        padding: "4px 8px",
        fontSize: 12,
        fontFamily: "monospace",
        border: "1px solid #E2E8F0",
        borderRadius: 4,
        width: "100%",
        color: "#1E293B",
      }}
    />
  );
}

function TeamsTab({ teams, assignments, showToast, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formId, setFormId] = useState("");
  const [formColor, setFormColor] = useState("#3B82F6");

  // Member count per team
  const memberCounts = useMemo(() => {
    const m = {};
    assignments.forEach((a) => {
      m[a.team_id] = (m[a.team_id] || 0) + 1;
    });
    return m;
  }, [assignments]);

  const handleAddTeam = async (e) => {
    e.preventDefault();
    if (!formName.trim() || !formId.trim()) {
      showToast("Name and ID are required", "error");
      return;
    }
    if (!/^[a-z0-9_]+$/.test(formId.trim())) {
      showToast("ID must be lowercase alphanumeric with underscores only", "error");
      return;
    }
    if (teams.some((t) => t.id === formId.trim())) {
      showToast("A team with that ID already exists", "error");
      return;
    }
    try {
      await createTeam({ id: formId.trim(), name: formName.trim(), color: formColor });
      showToast("Team created", "success");
      setFormName("");
      setFormId("");
      setFormColor("#3B82F6");
      setShowForm(false);
      await onRefresh();
    } catch (err) {
      showToast("Failed to create team: " + err.message, "error");
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete team "${name}"? This will remove all assignments and schedule entries for this team.`)) return;
    try {
      await deleteTeam(id);
      showToast("Team deleted", "success");
      await onRefresh();
    } catch (err) {
      showToast("Failed to delete team: " + err.message, "error");
    }
  };

  const handleCapacity = async (id, current, delta) => {
    const newVal = Math.max(1, current + delta);
    if (newVal === current) return;
    try {
      await updateTeam(id, { max_per_slot: newVal });
      await onRefresh();
    } catch (err) {
      showToast("Failed to update capacity: " + err.message, "error");
    }
  };

  return (
    <div>
      <div className="section-header" style={styles.sectionHeader}>
        <span style={{ fontSize: 14, color: "#64748B", fontWeight: 600 }}>
          {teams.length} team{teams.length !== 1 ? "s" : ""}
        </span>
        <button onClick={() => setShowForm(!showForm)} style={styles.addBtn}>
          <Icons.Plus /> Add Team
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAddTeam} className="admin-form" style={styles.addForm}>
          <input
            type="text"
            placeholder="Team Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            style={styles.formInput}
          />
          <input
            type="text"
            placeholder="team_id (lowercase)"
            value={formId}
            onChange={(e) => setFormId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            style={{ ...styles.formInput, fontFamily: "monospace" }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="color"
              value={formColor}
              onChange={(e) => setFormColor(e.target.value)}
              style={{ width: 36, height: 36, border: "none", cursor: "pointer", borderRadius: 6 }}
            />
            <input
              type="text"
              placeholder="#3B82F6"
              value={formColor}
              onChange={(e) => setFormColor(e.target.value)}
              style={{ ...styles.formInput, width: 100 }}
            />
          </div>
          <button type="submit" style={styles.submitBtn}>
            <Icons.Check /> Create
          </button>
          <button type="button" onClick={() => setShowForm(false)} style={styles.cancelBtn}>
            Cancel
          </button>
        </form>
      )}

      <div style={styles.cardGrid}>
        {teams.map((team, i) => {
          const colors = teamColors(team.color, i);
          const count = memberCounts[team.id] || 0;
          const cap = team.max_per_slot || 3;
          return (
            <div key={team.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    type="color"
                    value={team.color || colors.border}
                    onChange={async (e) => {
                      try {
                        await updateTeam(team.id, { color: e.target.value });
                        await onRefresh();
                      } catch (err) {
                        showToast("Failed to update color: " + err.message, "error");
                      }
                    }}
                    title="Change team color"
                    style={{
                      width: 20,
                      height: 20,
                      padding: 0,
                      border: `2px solid ${colors.border}`,
                      borderRadius: 4,
                      cursor: "pointer",
                      background: "none",
                    }}
                  />
                  <div>
                    <div style={styles.cardTitle}>{team.name}</div>
                    <div style={styles.cardSubtitle}>{team.id}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(team.id, team.name)}
                  title="Delete team"
                  style={{ ...styles.iconBtn, color: "#EF4444" }}
                >
                  <Icons.Trash />
                </button>
              </div>

              <div style={styles.cardBody}>
                <div style={styles.cardStat}>
                  <span style={styles.cardStatLabel}>Members</span>
                  <span style={styles.cardStatValue}>
                    <Icons.Users /> {count}
                  </span>
                </div>
                <div style={styles.cardStat}>
                  <span style={styles.cardStatLabel}>Capacity / slot</span>
                  <div style={styles.capacityRow}>
                    <button
                      onClick={() => handleCapacity(team.id, cap, -1)}
                      style={styles.capBtn}
                      title="Decrease capacity"
                    >
                      <Icons.Minus />
                    </button>
                    <span style={styles.capValue}>{cap}</span>
                    <button
                      onClick={() => handleCapacity(team.id, cap, 1)}
                      style={styles.capBtn}
                      title="Increase capacity"
                    >
                      <Icons.Plus />
                    </button>
                  </div>
                </div>
                <div style={styles.cardStat}>
                  <span style={styles.cardStatLabel}>KACE Queue User</span>
                  <KaceQueueInput
                    teamId={team.id}
                    value={team.kace_queue_user || ""}
                    onSave={async (val) => {
                      await updateTeam(team.id, { kace_queue_user: val });
                      await onRefresh();
                    }}
                    showToast={showToast}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {teams.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "#94A3B8", fontSize: 14 }}>
            No teams yet. Create one to get started.
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Assignments Tab                                                    */
/* ------------------------------------------------------------------ */
function AssignmentsTab({ students, teams, assignments, showToast, onRefresh }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  // Build assignment set for O(1) lookups
  const assignmentSet = useMemo(() => {
    const s = new Set();
    assignments.forEach((a) => s.add(`${a.cwid}|${a.team_id}`));
    return s;
  }, [assignments]);

  // Build per-student assignment lists
  const studentAssignments = useMemo(() => {
    const m = {};
    assignments.forEach((a) => {
      if (!m[a.cwid]) m[a.cwid] = new Set();
      m[a.cwid].add(a.team_id);
    });
    return m;
  }, [assignments]);

  // Count unassigned
  const unassignedCount = useMemo(() => {
    return students.filter((s) => !studentAssignments[s.cwid] || studentAssignments[s.cwid].size === 0).length;
  }, [students, studentAssignments]);

  // Filtered students
  const filtered = useMemo(() => {
    let list = students;

    // Text search
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (s) => s.name.toLowerCase().includes(q) || s.cwid.toString().includes(q)
      );
    }

    // Filter dropdown
    if (filter === "unassigned") {
      list = list.filter((s) => !studentAssignments[s.cwid] || studentAssignments[s.cwid].size === 0);
    } else if (filter !== "all") {
      // filter is a team_id
      list = list.filter((s) => studentAssignments[s.cwid]?.has(filter));
    }

    return list;
  }, [students, search, filter, studentAssignments]);

  const handleToggle = async (cwid, teamId) => {
    const key = `${cwid}|${teamId}`;
    const isAssigned = assignmentSet.has(key);
    try {
      if (isAssigned) {
        await unassignStudent(cwid, teamId);
      } else {
        await assignStudent(cwid, teamId);
      }
      await onRefresh();
    } catch (err) {
      showToast("Failed to update assignment: " + err.message, "error");
    }
  };

  return (
    <div>
      <div className="section-header" style={styles.sectionHeader}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flex: 1 }}>
          <div style={styles.searchWrap}>
            <span style={styles.searchIcon}><Icons.Search /></span>
            <input
              type="text"
              placeholder="Search by name or CWID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">All Students ({students.length})</option>
            <option value="unassigned">Unassigned ({unassignedCount})</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, minWidth: 180 }}>Student</th>
              {teams.map((team, i) => {
                const colors = teamColors(team.color, i);
                return (
                  <th key={team.id} style={{ ...styles.th, textAlign: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 3,
                          background: colors.border,
                        }}
                      />
                      {team.name}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={teams.length + 1} style={styles.emptyRow}>
                  No students found
                </td>
              </tr>
            ) : (
              filtered.map((student) => {
                const initial = student.name ? student.name.charAt(0).toUpperCase() : "?";
                return (
                  <tr key={student.cwid} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.nameCell}>
                        <div style={styles.avatar}>{initial}</div>
                        <div>
                          <div style={styles.nameText}>{student.name}</div>
                          <div style={styles.cwidSmall}>{student.cwid}</div>
                        </div>
                      </div>
                    </td>
                    {teams.map((team, i) => {
                      const key = `${student.cwid}|${team.id}`;
                      const isAssigned = assignmentSet.has(key);
                      const colors = teamColors(team.color, i);
                      return (
                        <td key={team.id} style={{ ...styles.td, textAlign: "center" }}>
                          <button
                            onClick={() => handleToggle(student.cwid, team.id)}
                            style={{
                              ...styles.matrixBtn,
                              background: isAssigned ? colors.bg : "#F8FAFC",
                              border: `1.5px solid ${isAssigned ? colors.border : "#E2E8F0"}`,
                              color: isAssigned ? colors.text : "#CBD5E1",
                            }}
                            title={isAssigned ? `Remove from ${team.name}` : `Assign to ${team.name}`}
                          >
                            {isAssigned ? <Icons.Check /> : <Icons.Plus />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Badges Tab                                                         */
/* ------------------------------------------------------------------ */
function BadgesTab({ badges, studentBadges, students, showToast, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [formIcon, setFormIcon] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [search, setSearch] = useState("");

  // Build assignment set for O(1) lookups: "cwid|badge_id"
  const assignmentSet = useMemo(() => {
    const s = new Set();
    (studentBadges || []).forEach((sb) => s.add(`${sb.cwid}|${sb.badge_id}`));
    return s;
  }, [studentBadges]);

  // Filtered students
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return students;
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || s.cwid.toString().includes(q)
    );
  }, [students, search]);

  const handleAddBadge = async (e) => {
    e.preventDefault();
    if (!formId.trim() || !formName.trim() || !formIcon.trim()) {
      showToast("All fields are required", "error");
      return;
    }
    if (!/^[a-z0-9_]+$/.test(formId.trim())) {
      showToast("ID must be lowercase alphanumeric with underscores only", "error");
      return;
    }
    if (badges.some((b) => b.id === formId.trim())) {
      showToast("A badge with that ID already exists", "error");
      return;
    }
    try {
      await createBadge({ id: formId.trim(), name: formName.trim(), icon: formIcon.trim() });
      showToast("Badge created", "success");
      setFormId("");
      setFormName("");
      setFormIcon("");
      setShowForm(false);
      await onRefresh();
    } catch (err) {
      showToast("Failed to create badge: " + err.message, "error");
    }
  };

  const handleDeleteBadge = async (id, name) => {
    if (!window.confirm(`Delete badge "${name}"? This will remove it from all students.`)) return;
    try {
      await deleteBadge(id);
      showToast("Badge deleted", "success");
      await onRefresh();
    } catch (err) {
      showToast("Failed to delete badge: " + err.message, "error");
    }
  };

  const handleStartEdit = (badge) => {
    setEditingId(badge.id);
    setEditName(badge.name);
    setEditIcon(badge.icon);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditIcon("");
  };

  const handleSaveEdit = async (id) => {
    if (!editName.trim() || !editIcon.trim()) {
      showToast("Name and icon are required", "error");
      return;
    }
    try {
      await updateBadge(id, { name: editName.trim(), icon: editIcon.trim() });
      showToast("Badge updated", "success");
      setEditingId(null);
      setEditName("");
      setEditIcon("");
      await onRefresh();
    } catch (err) {
      showToast("Failed to update badge: " + err.message, "error");
    }
  };

  const handleToggle = async (cwid, badgeId) => {
    const key = `${cwid}|${badgeId}`;
    const isAssigned = assignmentSet.has(key);
    try {
      if (isAssigned) {
        await revokeBadge(cwid, badgeId);
      } else {
        await assignBadge(cwid, badgeId);
      }
      await onRefresh();
    } catch (err) {
      showToast("Failed to update badge assignment: " + err.message, "error");
    }
  };

  return (
    <div>
      {/* Section A: Badge Management */}
      <div className="section-header" style={styles.sectionHeader}>
        <span style={{ fontSize: 14, color: "#64748B", fontWeight: 600 }}>
          {badges.length} badge{badges.length !== 1 ? "s" : ""}
        </span>
        <button onClick={() => setShowForm(!showForm)} style={styles.addBtn}>
          <Icons.Plus /> Add Badge
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAddBadge} className="admin-form" style={styles.addForm}>
          <input
            type="text"
            placeholder="badge_id (lowercase)"
            value={formId}
            onChange={(e) => setFormId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            style={{ ...styles.formInput, fontFamily: "monospace" }}
          />
          <input
            type="text"
            placeholder="Badge Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            style={styles.formInput}
          />
          <input
            type="text"
            placeholder="Icon (emoji)"
            value={formIcon}
            onChange={(e) => setFormIcon(e.target.value)}
            style={{ ...styles.formInput, width: 100 }}
          />
          <button type="submit" style={styles.submitBtn}>
            <Icons.Check /> Create
          </button>
          <button type="button" onClick={() => setShowForm(false)} style={styles.cancelBtn}>
            Cancel
          </button>
        </form>
      )}

      <div style={styles.cardGrid}>
        {badges.map((badge) => (
          <div key={badge.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "#F3F0FF",
                    border: "2px solid #7C3AED",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                  }}
                >
                  {badge.icon}
                </div>
                <div>
                  {editingId === badge.id ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        style={{ ...styles.formInput, fontSize: 13, padding: "4px 8px" }}
                      />
                      <input
                        type="text"
                        value={editIcon}
                        onChange={(e) => setEditIcon(e.target.value)}
                        style={{ ...styles.formInput, fontSize: 13, padding: "4px 8px", width: 80 }}
                      />
                    </div>
                  ) : (
                    <>
                      <div style={styles.cardTitle}>{badge.name}</div>
                      <div style={styles.cardSubtitle}>{badge.id}</div>
                    </>
                  )}
                </div>
              </div>
              <div style={styles.actions}>
                {editingId === badge.id ? (
                  <>
                    <button
                      onClick={() => handleSaveEdit(badge.id)}
                      title="Save changes"
                      style={{ ...styles.iconBtn, color: "#16A34A" }}
                    >
                      <Icons.Check />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      title="Cancel editing"
                      style={{ ...styles.iconBtn, color: "#64748B" }}
                    >
                      <Icons.X />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleStartEdit(badge)}
                      title="Edit badge"
                      style={{ ...styles.iconBtn, color: "#7C3AED" }}
                    >
                      <Icons.Edit />
                    </button>
                    <button
                      onClick={() => handleDeleteBadge(badge.id, badge.name)}
                      title="Delete badge"
                      style={{ ...styles.iconBtn, color: "#EF4444" }}
                    >
                      <Icons.Trash />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {badges.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "#94A3B8", fontSize: 14 }}>
            No badges yet. Create one to get started.
          </div>
        )}
      </div>

      {/* Section B: Badge Assignments */}
      <div style={{ marginTop: 32 }}>
        <div className="section-header" style={styles.sectionHeader}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flex: 1 }}>
            <div style={styles.searchWrap}>
              <span style={styles.searchIcon}><Icons.Search /></span>
              <input
                type="text"
                placeholder="Search by name or CWID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={styles.searchInput}
              />
            </div>
          </div>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, minWidth: 180 }}>Student</th>
                {badges.map((badge) => (
                  <th key={badge.id} style={{ ...styles.th, textAlign: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <span style={{ fontSize: 14 }}>{badge.icon}</span>
                      {badge.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={badges.length + 1} style={styles.emptyRow}>
                    No students found
                  </td>
                </tr>
              ) : (
                filtered.map((student) => {
                  const initial = student.name ? student.name.charAt(0).toUpperCase() : "?";
                  return (
                    <tr key={student.cwid} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={styles.nameCell}>
                          <div style={styles.avatar}>{initial}</div>
                          <div>
                            <div style={styles.nameText}>{student.name}</div>
                            <div style={styles.cwidSmall}>{student.cwid}</div>
                          </div>
                        </div>
                      </td>
                      {badges.map((badge) => {
                        const key = `${student.cwid}|${badge.id}`;
                        const isAssigned = assignmentSet.has(key);
                        return (
                          <td key={badge.id} style={{ ...styles.td, textAlign: "center" }}>
                            <button
                              onClick={() => handleToggle(student.cwid, badge.id)}
                              style={{
                                ...styles.matrixBtn,
                                background: isAssigned ? "#F3F0FF" : "#F8FAFC",
                                border: `1.5px solid ${isAssigned ? "#7C3AED" : "#E2E8F0"}`,
                                color: isAssigned ? "#7C3AED" : "#CBD5E1",
                              }}
                              title={isAssigned ? `Revoke ${badge.name}` : `Assign ${badge.name}`}
                            >
                              {isAssigned ? <Icons.Check /> : <Icons.Plus />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Time Off Tab                                                       */
/* ------------------------------------------------------------------ */
function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return `${parseInt(m)}/${parseInt(d)}/${y}`;
}

function TimeOffTab({ requests, showToast, onRefresh }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // "all" | "recurring" | "dated"
  const [deletingId, setDeletingId] = useState(null);

  const filtered = useMemo(() => {
    let list = requests;

    // Type filter
    if (filter === "recurring") {
      list = list.filter((r) => !r.effective_date);
    } else if (filter === "dated") {
      list = list.filter((r) => r.effective_date);
    }

    // Text search
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (r) =>
          r.student_name.toLowerCase().includes(q) ||
          r.cwid.toString().includes(q) ||
          r.day.toLowerCase().includes(q) ||
          (r.reason && r.reason.toLowerCase().includes(q))
      );
    }

    return list;
  }, [requests, search, filter]);

  // Stats
  const recurringCount = requests.filter((r) => !r.effective_date).length;
  const datedCount = requests.filter((r) => r.effective_date).length;

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await adminDeleteTimeOffRequest(id);
      showToast("Time off request removed", "success");
      await onRefresh();
    } catch {
      showToast("Failed to remove time off request", "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="section-header" style={styles.sectionHeader}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flex: 1 }}>
          <div style={styles.searchWrap}>
            <span style={styles.searchIcon}><Icons.Search /></span>
            <input
              type="text"
              placeholder="Search by name, CWID, or day..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">All Requests ({requests.length})</option>
            <option value="recurring">Recurring ({recurringCount})</option>
            <option value="dated">Scheduled Dates ({datedCount})</option>
          </select>
        </div>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Student</th>
              <th style={styles.th}>Day</th>
              <th style={styles.th}>Time</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Reason</th>
              <th style={{ ...styles.th, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={styles.emptyRow}>
                  No time off requests found
                </td>
              </tr>
            ) : (
              filtered.map((req) => {
                const initial = req.student_name ? req.student_name.charAt(0).toUpperCase() : "?";
                return (
                  <tr key={req.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.nameCell}>
                        <div style={styles.avatar}>{initial}</div>
                        <div>
                          <div style={styles.nameText}>{req.student_name}</div>
                          <div style={styles.cwidSmall}>{req.cwid}</div>
                        </div>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{req.day}</span>
                    </td>
                    <td style={styles.td}>
                      {!req.slot ? (
                        <span style={styles.timeOffFullDay}>Full Day</span>
                      ) : (
                        <span style={styles.timeOffSlot}>{req.slot}</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      {req.effective_date ? (
                        <span style={styles.timeOffDated}>One-time</span>
                      ) : (
                        <span style={styles.timeOffRecurring}>Recurring</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      {req.effective_date ? (
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#1E293B" }}>
                          {formatDate(req.effective_date)}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: "#94A3B8" }}>&mdash;</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      {req.reason ? (
                        <span style={{ fontSize: 12, color: "#475569", fontStyle: "italic" }}>
                          {req.reason}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: "#CBD5E1" }}>&mdash;</span>
                      )}
                    </td>
                    <td style={{ ...styles.td, textAlign: "right" }}>
                      <button
                        onClick={() => handleDelete(req.id)}
                        disabled={deletingId === req.id}
                        title="Remove request"
                        style={{
                          ...styles.iconBtn,
                          color: "#EF4444",
                          opacity: deletingId === req.id ? 0.4 : 1,
                        }}
                      >
                        <Icons.Trash />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Timeclock Tab                                                      */
/* ------------------------------------------------------------------ */
function formatTime12(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

function TimeclockTab({ requests, showToast, onRefresh }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("pending"); // "all" | "pending" | "fixed"
  const [resolvingId, setResolvingId] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const filtered = useMemo(() => {
    let list = requests;

    if (filter === "pending") {
      list = list.filter((r) => r.status === "pending");
    } else if (filter === "fixed") {
      list = list.filter((r) => r.status === "fixed");
    }

    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (r) =>
          (r.student_name || "").toLowerCase().includes(q) ||
          r.cwid.toString().includes(q) ||
          r.reason.toLowerCase().includes(q)
      );
    }

    return list;
  }, [requests, search, filter]);

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const fixedCount = requests.filter((r) => r.status === "fixed").length;

  const handleResolve = async (id) => {
    setResolvingId(id);
    try {
      await resolveTimeclockRequest(id, { admin_notes: adminNotes });
      showToast("Request marked as fixed", "success");
      setAdminNotes("");
      setExpandedId(null);
      await onRefresh();
    } catch {
      showToast("Failed to resolve request", "error");
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div>
      <div className="section-header" style={styles.sectionHeader}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flex: 1 }}>
          <div style={styles.searchWrap}>
            <span style={styles.searchIcon}><Icons.Search /></span>
            <input
              type="text"
              placeholder="Search by name, CWID, or reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="pending">Pending ({pendingCount})</option>
            <option value="fixed">Fixed ({fixedCount})</option>
            <option value="all">All Requests ({requests.length})</option>
          </select>
        </div>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Student</th>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Shift Time</th>
              <th style={styles.th}>Reason</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Submitted</th>
              <th style={{ ...styles.th, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={styles.emptyRow}>
                  No timeclock correction requests found
                </td>
              </tr>
            ) : (
              filtered.map((req) => {
                const initial = req.student_name ? req.student_name.charAt(0).toUpperCase() : "?";
                const isFixed = req.status === "fixed";
                const isExpanded = expandedId === req.id;
                return (
                  <tr key={req.id} style={{ ...styles.tr, opacity: isFixed ? 0.6 : 1 }}>
                    <td style={styles.td}>
                      <div style={styles.nameCell}>
                        <div style={styles.avatar}>{initial}</div>
                        <div>
                          <div style={styles.nameText}>{req.student_name}</div>
                          <div style={styles.cwidSmall}>{req.cwid}</div>
                        </div>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>
                        {formatDate(req.shift_date)}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ fontSize: 13, fontFamily: "monospace" }}>
                        {formatTime12(req.start_time)} &ndash; {formatTime12(req.end_time)}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ fontSize: 12, color: "#475569", fontStyle: "italic" }}>
                        {req.reason}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {isFixed ? (
                        <span style={styles.tcStatusFixed}>Fixed</span>
                      ) : (
                        <span style={styles.tcStatusPending}>Pending</span>
                      )}
                      {isFixed && req.admin_notes && (
                        <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>
                          Note: {req.admin_notes}
                        </div>
                      )}
                      {isFixed && req.resolved_at && (
                        <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>
                          {formatDate(req.resolved_at.split("T")[0] || req.resolved_at.split(" ")[0])}
                        </div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <span style={{ fontSize: 12, color: "#64748B" }}>
                        {formatDate(req.created_at.split("T")[0] || req.created_at.split(" ")[0])}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: "right" }}>
                      {!isFixed && (
                        <div>
                          {isExpanded ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                              <input
                                type="text"
                                placeholder="Admin notes (optional)"
                                value={adminNotes}
                                onChange={(e) => setAdminNotes(e.target.value)}
                                style={{ ...styles.formInput, width: 180, fontSize: 12 }}
                              />
                              <div style={{ display: "flex", gap: 4 }}>
                                <button
                                  onClick={() => { setExpandedId(null); setAdminNotes(""); }}
                                  style={{ ...styles.iconBtn, fontSize: 11, width: "auto", padding: "4px 8px" }}
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleResolve(req.id)}
                                  disabled={resolvingId === req.id}
                                  style={{
                                    ...styles.submitBtn,
                                    fontSize: 11,
                                    padding: "4px 10px",
                                    opacity: resolvingId === req.id ? 0.5 : 1,
                                  }}
                                >
                                  {resolvingId === req.id ? "Saving..." : "Confirm"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setExpandedId(req.id)}
                              style={{
                                ...styles.submitBtn,
                                fontSize: 11,
                                padding: "5px 12px",
                              }}
                            >
                              <Icons.Check /> Mark Fixed
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */
const styles = {
  // Page
  pageWrap: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "0 24px 40px",
  },

  // Loading
  loadingWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "80px 24px",
    gap: 16,
  },
  loadingSpinner: {
    width: 32,
    height: 32,
    border: "3px solid #E2E8F0",
    borderTopColor: "#0F172A",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: {
    fontSize: 14,
    fontWeight: 600,
    color: "#64748B",
  },

  // Access denied
  accessDenied: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "80px 24px",
    color: "#64748B",
  },

  // Tab bar
  tabBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#FFF",
    borderBottom: "1px solid #E2E8F0",
    padding: "12px 24px",
    borderRadius: "12px 12px 0 0",
    marginBottom: 0,
  },
  tabGroup: {
    display: "flex",
    gap: 4,
  },
  tabActive: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    background: "#0F172A",
    color: "#FFF",
    borderRadius: 8,
    border: "none",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  tabInactive: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    background: "transparent",
    color: "#64748B",
    borderRadius: 8,
    border: "1px solid #E2E8F0",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  lockBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },

  // Section header
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 0",
    gap: 12,
  },

  // Search
  searchWrap: {
    position: "relative",
    flex: 1,
    maxWidth: 340,
  },
  searchIcon: {
    position: "absolute",
    left: 10,
    top: "50%",
    transform: "translateY(-50%)",
    color: "#94A3B8",
    display: "flex",
  },
  searchInput: {
    width: "100%",
    padding: "8px 12px 8px 34px",
    border: "1.5px solid #CBD5E1",
    borderRadius: 8,
    fontSize: 13,
    outline: "none",
    color: "#1E293B",
    boxSizing: "border-box",
  },

  // Filter
  filterSelect: {
    padding: "8px 12px",
    border: "1.5px solid #CBD5E1",
    borderRadius: 8,
    fontSize: 13,
    color: "#1E293B",
    background: "#FFF",
    cursor: "pointer",
    outline: "none",
  },

  // Add button
  addBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    background: "#0F172A",
    color: "#FFF",
    border: "none",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  // Forms
  addForm: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "14px 16px",
    background: "#F8FAFC",
    borderRadius: 10,
    border: "1px solid #E2E8F0",
    marginBottom: 16,
    flexWrap: "wrap",
  },
  formInput: {
    padding: "8px 12px",
    border: "1.5px solid #CBD5E1",
    borderRadius: 8,
    fontSize: 13,
    outline: "none",
    color: "#1E293B",
  },
  submitBtn: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "8px 14px",
    background: "#16A34A",
    color: "#FFF",
    border: "none",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  cancelBtn: {
    padding: "8px 14px",
    background: "transparent",
    color: "#64748B",
    border: "1px solid #E2E8F0",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },

  // Table
  tableWrap: {
    background: "#FFF",
    borderRadius: 12,
    border: "1px solid #E2E8F0",
    overflow: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    padding: "12px 16px",
    fontSize: 12,
    fontWeight: 700,
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    textAlign: "left",
    borderBottom: "2px solid #E2E8F0",
    background: "#FAFAFA",
  },
  tr: {
    borderBottom: "1px solid #F1F5F9",
  },
  td: {
    padding: "12px 16px",
    fontSize: 13,
    color: "#1E293B",
    verticalAlign: "middle",
  },
  emptyRow: {
    padding: "40px 16px",
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 14,
  },

  // Name cell
  nameCell: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "#E2E8F0",
    color: "#475569",
    fontWeight: 700,
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  nameText: {
    fontWeight: 600,
    fontSize: 13,
    color: "#1E293B",
  },
  cwidSmall: {
    fontSize: 11,
    fontFamily: "monospace",
    color: "#94A3B8",
  },

  // CWID
  cwid: {
    fontFamily: "monospace",
    fontSize: 13,
    color: "#475569",
    background: "#F1F5F9",
    padding: "2px 8px",
    borderRadius: 4,
  },

  // Role badges
  roleAdmin: {
    display: "inline-block",
    padding: "3px 10px",
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 12,
    background: "#7C3AED",
    color: "#FFF",
  },
  roleStudent: {
    display: "inline-block",
    padding: "3px 10px",
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 12,
    background: "#E2E8F0",
    color: "#475569",
  },

  // Team tags
  teamTags: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
  },
  teamTag: {
    padding: "3px 8px",
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 6,
  },
  noTeams: {
    fontSize: 12,
    color: "#CBD5E1",
    fontStyle: "italic",
  },

  // Actions
  actions: {
    display: "flex",
    gap: 4,
    justifyContent: "flex-end",
  },
  iconBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    background: "transparent",
    border: "1px solid #E2E8F0",
    borderRadius: 6,
    cursor: "pointer",
    transition: "background 0.15s",
  },

  // Cards (Teams)
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: 16,
  },
  card: {
    background: "#FFF",
    border: "1px solid #E2E8F0",
    borderRadius: 12,
    padding: 20,
  },
  cardHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#0F172A",
  },
  cardSubtitle: {
    fontSize: 11,
    fontFamily: "monospace",
    color: "#94A3B8",
    marginTop: 2,
  },
  cardBody: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  cardStat: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardStatLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "#64748B",
  },
  cardStatValue: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 13,
    fontWeight: 700,
    color: "#1E293B",
  },
  capacityRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  capBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    border: "1px solid #E2E8F0",
    borderRadius: 6,
    background: "#FFF",
    cursor: "pointer",
    color: "#475569",
  },
  capValue: {
    fontSize: 15,
    fontWeight: 700,
    color: "#0F172A",
    minWidth: 20,
    textAlign: "center",
  },

  // Badge pill (Students tab)
  badgePill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    padding: "2px 7px",
    fontSize: 10,
    fontWeight: 600,
    borderRadius: 10,
    background: "#F3F0FF",
    color: "#7C3AED",
    border: "1px solid #DDD6FE",
    whiteSpace: "nowrap",
  },

  // Matrix button (Assignments)
  matrixBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 34,
    height: 34,
    borderRadius: 8,
    cursor: "pointer",
    transition: "all 0.15s",
  },

  // Clear schedule button
  clearBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    background: "#FEF2F2",
    color: "#DC2626",
    border: "1px solid #FECACA",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  dangerBtn: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "8px 16px",
    background: "#DC2626",
    color: "#FFF",
    border: "none",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },

  // Modal
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(15, 23, 42, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalBox: {
    background: "#FFF",
    borderRadius: 16,
    padding: "28px 32px",
    maxWidth: 440,
    width: "90%",
    boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
  },

  // Time Off tab
  timeOffFullDay: {
    display: "inline-block",
    padding: "3px 10px",
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 12,
    background: "#0F172A",
    color: "#FFF",
  },
  timeOffSlot: {
    display: "inline-block",
    padding: "3px 10px",
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 12,
    background: "#F1F5F9",
    color: "#475569",
    fontFamily: "monospace",
  },
  timeOffRecurring: {
    display: "inline-block",
    padding: "3px 10px",
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 12,
    background: "#DBEAFE",
    color: "#1D4ED8",
  },
  timeOffDated: {
    display: "inline-block",
    padding: "3px 10px",
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 12,
    background: "#FEF3C7",
    color: "#92400E",
  },

  // Timeclock tab
  tcStatusPending: {
    display: "inline-block",
    padding: "3px 10px",
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 12,
    background: "#FEF3C7",
    color: "#92400E",
  },
  tcStatusFixed: {
    display: "inline-block",
    padding: "3px 10px",
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 12,
    background: "#DCFCE7",
    color: "#16A34A",
  },
};
