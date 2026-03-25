import { useState, useEffect, useMemo } from "react";
import { Icons } from "../components/Icons";
import { DAYS, teamColors, slotToMinutes, buildTeamHoursMap, getVisibleSlots, isSlotActiveForTeam } from "../styles/theme";
import { getAllTeams, getScheduleByDay, getTimeOffByDay, getAllStudentBadges, getAllTeamHours } from "../api/client";
import { getKACETickets } from "../api/kace";

function useCurrentMinutes() {
  const [now, setNow] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });

  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setNow(d.getHours() * 60 + d.getMinutes());
    }, 30000);
    return () => clearInterval(id);
  }, []);

  return now;
}

function getTodayName() {
  const dayIndex = new Date().getDay(); // 0=Sun
  if (dayIndex >= 1 && dayIndex <= 5) return DAYS[dayIndex - 1];
  return null;
}

export default function TodayPage() {
  const todayName = getTodayName();
  const [teams, setTeams] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [timeOff, setTimeOff] = useState([]);
  const [studentBadges, setStudentBadges] = useState([]);
  const [kaceData, setKaceData] = useState({ students: {}, teams: {} });
  const [teamHoursMap, setTeamHoursMap] = useState({});
  const [loading, setLoading] = useState(true);
  const currentMinutes = useCurrentMinutes();

  useEffect(() => {
    if (!todayName) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        const [teamsData, scheduleData, timeOffData, badgesData, kaceResult, teamHoursData] = await Promise.all([
          getAllTeams(),
          getScheduleByDay(todayName),
          getTimeOffByDay(todayName),
          getAllStudentBadges(),
          getKACETickets(),
          getAllTeamHours(),
        ]);
        if (!cancelled) {
          setTeams(teamsData || []);
          setSchedule(scheduleData || []);
          setTimeOff(timeOffData || []);
          setStudentBadges(badgesData || []);
          setKaceData(kaceResult || { students: {}, teams: {} });
          setTeamHoursMap(buildTeamHoursMap(teamHoursData || []));
        }
      } catch (err) {
        console.error("Failed to load today data:", err);
        if (!cancelled) {
          setTeams([]);
          setSchedule([]);
          setTimeOff([]);
          setStudentBadges([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [todayName]);

  // Time-off lookups
  const fullDayOffCwids = useMemo(() => {
    const set = new Set();
    timeOff.forEach((t) => { if (!t.slot) set.add(t.cwid); });
    return set;
  }, [timeOff]);

  const slotOffKeys = useMemo(() => {
    const set = new Set();
    timeOff.forEach((t) => { if (t.slot) set.add(`${t.cwid}|${t.slot}`); });
    return set;
  }, [timeOff]);

  const hasTimeOff = (cwid, slot) => {
    return fullDayOffCwids.has(cwid) || slotOffKeys.has(`${cwid}|${slot}`);
  };

  // Badge lookup
  const badgeMap = useMemo(() => {
    const map = {};
    studentBadges.forEach((b) => {
      if (!map[b.cwid]) map[b.cwid] = [];
      map[b.cwid].push({ badge_id: b.badge_id, badge_name: b.badge_name, badge_icon: b.badge_icon });
    });
    return map;
  }, [studentBadges]);

  const getSlotStudents = (slot, teamId) => {
    return schedule.filter((s) => s.slot === slot && s.team_id === teamId);
  };

  const teamColorMap = useMemo(() => {
    const map = {};
    teams.forEach((team, i) => { map[team.id] = teamColors(team.color, i); });
    return map;
  }, [teams]);

  const studentTickets = kaceData.students || {};
  const teamTicketTotals = kaceData.teams || {};

  const visibleSlots = useMemo(
    () => todayName ? getVisibleSlots(teamHoursMap, teams, todayName) : [],
    [teamHoursMap, teams, todayName]
  );

  const gridCols = `120px${teams.map(() => " 1fr").join("")}`;

  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.loadingSpinner} />
        <span style={styles.loadingText}>Loading today's schedule...</span>
      </div>
    );
  }

  if (!todayName) {
    return (
      <div style={styles.emptyWrap}>
        <span style={styles.emptyText}>It's the weekend! No schedule to display.</span>
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

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div style={styles.wrap}>
      <div className="today-header" style={styles.todayHeader}>
        <div style={styles.todayTitle}>{dateStr}</div>
        <div style={styles.todaySubtitle}>Live schedule with time off and ticket counts</div>
      </div>

      <div className="schedule-grid" style={styles.grid}>
        {/* Header row */}
        <div style={{ ...styles.headerRow, gridTemplateColumns: gridCols }}>
          <div style={styles.timeCol} />
          {teams.map((team, i) => {
            const colors = teamColorMap[team.id];
            const teamTotal = teamTicketTotals[team.id] || 0;
            return (
              <div
                key={team.id}
                style={{
                  ...styles.teamCol,
                  background: colors.bg,
                  borderTop: `4px solid ${colors.border}`,
                }}
              >
                <div>{team.name}</div>
                {teamTotal > 0 && (
                  <div
                    style={styles.teamTicketBadge}
                    title={`${teamTotal} total tickets for this team`}
                  >
                    🎫 {teamTotal}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Time slot rows */}
        {visibleSlots.map((slot, si) => {
          const slotStart = slotToMinutes(slot);
          const slotEnd = slotStart + 30;
          const showRedLine = currentMinutes >= slotStart && currentMinutes < slotEnd;
          const redLinePercent = showRedLine ? ((currentMinutes - slotStart) / 30) * 100 : 0;

          return (
            <div
              key={slot}
              style={{
                ...styles.row,
                gridTemplateColumns: gridCols,
                background: si % 2 === 0 ? "#FAFAFA" : "#FFF",
                position: "relative",
              }}
            >
              {showRedLine && (
                <div
                  style={{
                    position: "absolute",
                    top: `${redLinePercent}%`,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: "#DC2626",
                    zIndex: 10,
                    pointerEvents: "none",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: -4,
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: "#DC2626",
                    }}
                  />
                </div>
              )}
              <div style={styles.timeCol}>
                <span style={styles.time}>{slot}</span>
              </div>
              {teams.map((team) => {
                const active = isSlotActiveForTeam(slot, team.id, todayName, teamHoursMap);
                if (!active) {
                  return (
                    <div key={team.id} style={{ ...styles.teamCell, opacity: 0.25, background: "#F8FAFC" }}>
                      <span style={styles.empty}>&mdash;</span>
                    </div>
                  );
                }
                const students = getSlotStudents(slot, team.id);
                const count = students.length;
                const max = team.max_per_slot || 3;
                const colors = teamColorMap[team.id];
                const capacityColor =
                  count >= max ? "#16A34A" : count > 0 ? "#D97706" : "#CBD5E1";

                return (
                  <div key={team.id} style={styles.teamCell}>
                    {students.length > 0 ? (
                      <div style={styles.names}>
                        {students.map((student) => {
                          const off = hasTimeOff(student.cwid, slot);
                          return (
                            <span
                              key={student.cwid}
                              style={{
                                ...styles.nameTag,
                                background: off ? "#F1F5F9" : colors.bg,
                                color: off ? "#94A3B8" : colors.text,
                                borderLeft: `3px solid ${off ? "#CBD5E1" : colors.border}`,
                                textDecoration: off ? "line-through" : "none",
                              }}
                            >
                              {student.student_name}
                              {(studentTickets[student.cwid] || 0) > 0 && (
                                <span
                                  style={styles.studentTicketCount}
                                  title={`${studentTickets[student.cwid]} active ticket${studentTickets[student.cwid] > 1 ? "s" : ""}`}
                                >
                                  🎫{studentTickets[student.cwid]}
                                </span>
                              )}
                              {(badgeMap[student.cwid] || []).map((badge) => (
                                <span
                                  key={badge.badge_id}
                                  title={badge.badge_name}
                                  style={styles.badgeIcon}
                                >
                                  {badge.badge_icon}
                                </span>
                              ))}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span style={styles.empty}>&mdash;</span>
                    )}
                    <span style={{ ...styles.count, color: capacityColor }}>
                      <Icons.Users /> {count}/{max}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
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
  emptyWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "80px 24px",
  },
  emptyText: {
    fontSize: 14,
    fontWeight: 500,
    color: "#94A3B8",
  },
  wrap: {
    maxWidth: 1100,
    margin: "0 auto",
    overflowX: "auto",
  },
  todayHeader: {
    marginBottom: 16,
  },
  todayTitle: {
    fontSize: 20,
    fontWeight: 800,
    color: "#0F172A",
  },
  todaySubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  grid: {
    background: "#FFF",
    borderRadius: 12,
    border: "1px solid #E2E8F0",
    overflow: "hidden",
    minWidth: 800,
  },
  headerRow: {
    display: "grid",
    borderBottom: "2px solid #E2E8F0",
  },
  timeCol: {
    padding: "12px",
    display: "flex",
    alignItems: "center",
  },
  teamCol: {
    padding: "14px 16px",
    fontSize: 13,
    fontWeight: 700,
    textAlign: "center",
    color: "#1E293B",
  },
  row: {
    display: "grid",
    borderBottom: "1px solid #F1F5F9",
    minHeight: 52,
  },
  time: {
    fontSize: 12,
    fontWeight: 700,
    color: "#475569",
  },
  teamCell: {
    padding: "6px 10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderLeft: "1px solid #F1F5F9",
  },
  names: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
    flex: 1,
  },
  nameTag: {
    padding: "3px 8px",
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 4,
  },
  empty: {
    color: "#CBD5E1",
    fontSize: 14,
  },
  badgeIcon: {
    fontSize: 11,
    marginLeft: 3,
    cursor: "default",
  },
  count: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
    fontWeight: 700,
    marginLeft: 8,
    whiteSpace: "nowrap",
  },
  teamTicketBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 10,
    background: "rgba(0,0,0,0.06)",
    color: "#475569",
  },
  studentTicketCount: {
    fontSize: 10,
    fontWeight: 700,
    marginLeft: 4,
    color: "#6366F1",
  },
};
