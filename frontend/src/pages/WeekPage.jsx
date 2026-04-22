import { useState, useEffect, useMemo, useRef } from "react";
import { Icons } from "../components/Icons";
import { DAYS, teamColors, buildTeamHoursMap, getVisibleSlots, isSlotActiveForTeam } from "../styles/theme";
import { getAllTeams, getScheduleByDay, getAllStudentBadges, getAllTeamHours } from "../api/client";

export default function WeekPage() {
  const [teams, setTeams] = useState([]);
  const [scheduleByDay, setScheduleByDay] = useState({});
  const [studentBadges, setStudentBadges] = useState([]);
  const [teamHoursMap, setTeamHoursMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedTeams, setSelectedTeams] = useState(new Set());
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const teamRef = useRef(null);
  const studentRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (teamRef.current && !teamRef.current.contains(e.target)) setTeamDropdownOpen(false);
      if (studentRef.current && !studentRef.current.contains(e.target)) setStudentDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      try {
        const [teamsData, badgesData, teamHoursData, ...daySchedules] = await Promise.all([
          getAllTeams(),
          getAllStudentBadges(),
          getAllTeamHours(),
          ...DAYS.map((d) => getScheduleByDay(d)),
        ]);
        if (cancelled) return;
        setTeams(teamsData || []);
        setStudentBadges(badgesData || []);
        setTeamHoursMap(buildTeamHoursMap(teamHoursData || []));
        const byDay = {};
        DAYS.forEach((d, i) => { byDay[d] = daySchedules[i] || []; });
        setScheduleByDay(byDay);
        // Default: all teams selected
        setSelectedTeams(new Set((teamsData || []).map((t) => t.id)));
      } catch (err) {
        console.error("Failed to load week data:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, []);

  const badgeMap = useMemo(() => {
    const map = {};
    studentBadges.forEach((b) => {
      if (!map[b.cwid]) map[b.cwid] = [];
      map[b.cwid].push(b);
    });
    return map;
  }, [studentBadges]);

  const teamColorMap = useMemo(() => {
    const map = {};
    teams.forEach((team, i) => { map[team.id] = teamColors(team.color, i); });
    return map;
  }, [teams]);

  // All unique students across every day
  const allStudents = useMemo(() => {
    const map = new Map();
    Object.values(scheduleByDay).forEach((entries) => {
      entries.forEach((e) => {
        if (!map.has(e.cwid)) map.set(e.cwid, e.student_name);
      });
    });
    return Array.from(map.entries())
      .map(([cwid, name]) => ({ cwid, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [scheduleByDay]);

  const filteredTeams = useMemo(
    () => teams.filter((t) => selectedTeams.has(t.id)),
    [teams, selectedTeams],
  );

  // Build visible slots from union of all days for filtered teams
  const visibleSlotsByDay = useMemo(() => {
    const result = {};
    DAYS.forEach((day) => {
      result[day] = getVisibleSlots(teamHoursMap, filteredTeams, day);
    });
    return result;
  }, [teamHoursMap, filteredTeams]);

  // Union of all visible slots across days for consistent rows
  const allVisibleSlots = useMemo(() => {
    const slotSet = new Set();
    Object.values(visibleSlotsByDay).forEach((slots) => slots.forEach((s) => slotSet.add(s)));
    // Sort by time
    return Array.from(slotSet).sort((a, b) => {
      const toMin = (s) => { const p = s.split(" - ")[0].split(":"); let h = +p[0]; if (h < 8) h += 12; return h * 60 + +p[1]; };
      return toMin(a) - toMin(b);
    });
  }, [visibleSlotsByDay]);

  const getSlotStudents = (day, slot, teamId) => {
    const entries = scheduleByDay[day] || [];
    return entries.filter((s) => {
      if (s.slot !== slot || s.team_id !== teamId) return false;
      if (selectedStudents.size > 0 && !selectedStudents.has(s.cwid)) return false;
      return true;
    });
  };

  const toggleTeam = (id) => {
    setSelectedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleStudent = (cwid) => {
    setSelectedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(cwid)) next.delete(cwid); else next.add(cwid);
      return next;
    });
  };

  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.loadingSpinner} />
        <span style={styles.loadingText}>Loading weekly schedule...</span>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div style={styles.emptyWrap}>
        <span style={styles.emptyText}>No teams configured yet.</span>
      </div>
    );
  }

  const dayColWidth = filteredTeams.length > 1
    ? `minmax(${filteredTeams.length * 140}px, 1fr)`
    : "minmax(180px, 1fr)";
  const outerGridCols = `80px ${DAYS.map(() => dayColWidth).join(" ")}`;
  const innerGridCols = filteredTeams.map(() => "1fr").join(" ");

  return (
    <div style={styles.wrap}>
      {/* Filters */}
      <div style={styles.filterBar}>
        {/* Team filter */}
        <div ref={teamRef} style={styles.filterGroup}>
          <button
            onClick={() => { setTeamDropdownOpen((v) => !v); setStudentDropdownOpen(false); }}
            style={styles.filterBtn}
          >
            <Icons.Users /> Teams ({selectedTeams.size}/{teams.length})
            <Icons.ChevronDown />
          </button>
          {teamDropdownOpen && (
            <div style={styles.dropdown}>
              <div
                style={styles.dropdownItem}
                onClick={() => {
                  if (selectedTeams.size === teams.length) setSelectedTeams(new Set());
                  else setSelectedTeams(new Set(teams.map((t) => t.id)));
                }}
              >
                <input type="checkbox" checked={selectedTeams.size === teams.length} readOnly style={styles.checkbox} />
                <span style={{ fontWeight: 600 }}>Select All</span>
              </div>
              {teams.map((t) => (
                <div key={t.id} style={styles.dropdownItem} onClick={() => toggleTeam(t.id)}>
                  <input type="checkbox" checked={selectedTeams.has(t.id)} readOnly style={styles.checkbox} />
                  <span style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: teamColorMap[t.id]?.border || "#999", flexShrink: 0,
                  }} />
                  {t.name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Student filter */}
        <div ref={studentRef} style={styles.filterGroup}>
          <button
            onClick={() => { setStudentDropdownOpen((v) => !v); setTeamDropdownOpen(false); }}
            style={styles.filterBtn}
          >
            <Icons.User /> Students {selectedStudents.size > 0 ? `(${selectedStudents.size})` : "(All)"}
            <Icons.ChevronDown />
          </button>
          {studentDropdownOpen && (
            <div style={styles.dropdown}>
              <div style={{ padding: "6px 10px", borderBottom: "1px solid #E2E8F0" }}>
                <input
                  type="text"
                  placeholder="Search students..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  style={styles.searchInput}
                />
              </div>
              <div
                style={styles.dropdownItem}
                onClick={() => { setSelectedStudents(new Set()); setStudentSearch(""); }}
              >
                <input type="checkbox" checked={selectedStudents.size === 0} readOnly style={styles.checkbox} />
                <span style={{ fontWeight: 600 }}>All Students</span>
              </div>
              <div style={{ maxHeight: 220, overflowY: "auto" }}>
                {allStudents
                  .filter((s) => s.name.toLowerCase().includes(studentSearch.toLowerCase()))
                  .map((s) => (
                    <div key={s.cwid} style={styles.dropdownItem} onClick={() => toggleStudent(s.cwid)}>
                      <input type="checkbox" checked={selectedStudents.has(s.cwid)} readOnly style={styles.checkbox} />
                      {s.name}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Week grid */}
      <div style={styles.gridOuter}>
        <div style={{ display: "grid", gridTemplateColumns: outerGridCols, minWidth: filteredTeams.length * 140 * 5 + 80 }}>
          {/* Day headers */}
          <div style={styles.cornerCell} />
          {DAYS.map((day) => (
            <div key={day} style={styles.dayHeader}>
              <span style={styles.dayLabel}>{day}</span>
              {filteredTeams.length > 1 && (
                <div style={{ display: "grid", gridTemplateColumns: innerGridCols, marginTop: 4 }}>
                  {filteredTeams.map((t) => (
                    <span key={t.id} style={{
                      fontSize: 10, fontWeight: 600, textAlign: "center",
                      color: teamColorMap[t.id]?.border || "#666",
                    }}>
                      {t.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Slot rows */}
          {allVisibleSlots.map((slot, si) => (
            <div key={slot} style={{ display: "contents" }}>
              <div style={{ ...styles.timeCell, background: si % 2 === 0 ? "#FAFAFA" : "#FFF" }}>
                <span style={styles.timeLabel}>{slot}</span>
              </div>
              {DAYS.map((day) => (
                <div
                  key={day}
                  style={{
                    display: "grid",
                    gridTemplateColumns: innerGridCols,
                    background: si % 2 === 0 ? "#FAFAFA" : "#FFF",
                    borderLeft: "1px solid #E2E8F0",
                  }}
                >
                  {filteredTeams.map((team) => {
                    const active = isSlotActiveForTeam(slot, team.id, day, teamHoursMap);
                    if (!active) {
                      return (
                        <div key={team.id} style={{ ...styles.cell, opacity: 0.2, background: "#F8FAFC" }}>
                          <span style={styles.emptyCell}>&mdash;</span>
                        </div>
                      );
                    }
                    const students = getSlotStudents(day, slot, team.id);
                    const colors = teamColorMap[team.id];
                    return (
                      <div key={team.id} style={styles.cell}>
                        {students.length > 0 ? (
                          <div style={styles.names}>
                            {students.map((s) => (
                              <span
                                key={s.cwid}
                                style={{
                                  ...styles.nameTag,
                                  background: colors.bg,
                                  color: colors.text,
                                  borderLeft: `2px solid ${colors.border}`,
                                }}
                              >
                                {s.student_name}
                                {(badgeMap[s.cwid] || []).map((b) => (
                                  <span key={b.badge_id} title={b.badge_name} style={{ fontSize: 10, marginLeft: 2 }}>
                                    {b.badge_icon}
                                  </span>
                                ))}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={styles.emptyCell}>&mdash;</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  loadingWrap: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", padding: "80px 24px", gap: 16,
  },
  loadingSpinner: {
    width: 32, height: 32, border: "3px solid #E2E8F0",
    borderTopColor: "#0F172A", borderRadius: "50%", animation: "spin 0.8s linear infinite",
  },
  loadingText: { fontSize: 14, fontWeight: 600, color: "#64748B" },
  emptyWrap: { display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 24px" },
  emptyText: { fontSize: 14, fontWeight: 500, color: "#94A3B8" },
  wrap: { maxWidth: 1600, margin: "0 auto" },
  filterBar: {
    display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap",
  },
  filterGroup: { position: "relative" },
  filterBtn: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "8px 14px", borderRadius: 8, border: "1px solid #CBD5E1",
    background: "#FFF", color: "#334155", fontSize: 13,
    fontWeight: 500, cursor: "pointer",
  },
  dropdown: {
    position: "absolute", top: "100%", left: 0, marginTop: 4,
    background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 8,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 50,
    minWidth: 220,
  },
  dropdownItem: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "8px 12px", fontSize: 13, cursor: "pointer",
    borderBottom: "1px solid #F1F5F9",
  },
  checkbox: { width: 14, height: 14, accentColor: "#3B82F6" },
  searchInput: {
    width: "100%", padding: "6px 8px", border: "1px solid #E2E8F0",
    borderRadius: 6, fontSize: 13, outline: "none",
  },
  gridOuter: {
    background: "#FFF", borderRadius: 12, border: "1px solid #E2E8F0",
    overflow: "auto",
  },
  cornerCell: {
    padding: 8, borderBottom: "2px solid #E2E8F0", background: "#FFF",
    position: "sticky", left: 0, zIndex: 2,
  },
  dayHeader: {
    padding: "10px 6px", borderBottom: "2px solid #E2E8F0",
    textAlign: "center", background: "#FFF", borderLeft: "1px solid #E2E8F0",
  },
  dayLabel: { fontSize: 13, fontWeight: 700, color: "#1E293B" },
  timeCell: {
    padding: "4px 8px", display: "flex", alignItems: "center",
    borderBottom: "1px solid #F1F5F9",
    position: "sticky", left: 0, zIndex: 1, background: "inherit",
  },
  timeLabel: { fontSize: 11, fontWeight: 700, color: "#475569", whiteSpace: "nowrap" },
  cell: {
    padding: "3px 4px", minHeight: 36,
    display: "flex", alignItems: "center",
    borderLeft: "1px solid #F1F5F9",
    borderBottom: "1px solid #F1F5F9",
  },
  names: { display: "flex", flexDirection: "column", gap: 2, width: "100%" },
  nameTag: {
    padding: "2px 5px", fontSize: 10, fontWeight: 600,
    borderRadius: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  emptyCell: { color: "#CBD5E1", fontSize: 12 },
};
