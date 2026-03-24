import { useState, useEffect, useMemo } from "react";
import { Icons } from "../components/Icons";
import { TIME_SLOTS, teamColors } from "../styles/theme";
import { getAllTeams, getScheduleByDay, getAllStudentBadges } from "../api/client";

export default function SchedulePage({ day }) {
  const [teams, setTeams] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [studentBadges, setStudentBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        const [teamsData, scheduleData, badgesData] = await Promise.all([
          getAllTeams(),
          getScheduleByDay(day),
          getAllStudentBadges(),
        ]);
        if (!cancelled) {
          setTeams(teamsData || []);
          setSchedule(scheduleData || []);
          setStudentBadges(badgesData || []);
        }
      } catch (err) {
        console.error("Failed to load schedule data:", err);
        if (!cancelled) {
          setTeams([]);
          setSchedule([]);
          setStudentBadges([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [day]);

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
    teams.forEach((team, i) => {
      map[team.id] = teamColors(team.color, i);
    });
    return map;
  }, [teams]);

  const gridCols = `120px${teams.map(() => " 1fr").join("")}`;

  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.loadingSpinner} />
        <span style={styles.loadingText}>Loading schedule...</span>
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

  return (
    <div style={styles.wrap}>
      <div className="schedule-grid" style={styles.grid}>
        {/* Header row */}
        <div style={{ ...styles.headerRow, gridTemplateColumns: gridCols }}>
          <div style={styles.timeCol} />
          {teams.map((team, i) => {
            const colors = teamColorMap[team.id];
            return (
              <div
                key={team.id}
                style={{
                  ...styles.teamCol,
                  background: colors.bg,
                  borderTop: `4px solid ${colors.border}`,
                }}
              >
                {team.name}
              </div>
            );
          })}
        </div>

        {/* Time slot rows */}
        {TIME_SLOTS.map((slot, si) => (
          <div
            key={slot}
            style={{
              ...styles.row,
              gridTemplateColumns: gridCols,
              background: si % 2 === 0 ? "#FAFAFA" : "#FFF",
            }}
          >
            <div style={styles.timeCol}>
              <span style={styles.time}>{slot}</span>
            </div>
            {teams.map((team) => {
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
                      {students.map((student) => (
                        <span
                          key={student.cwid}
                          style={{
                            ...styles.nameTag,
                            background: colors.bg,
                            color: colors.text,
                            borderLeft: `3px solid ${colors.border}`,
                          }}
                        >
                          {student.student_name}
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
                      ))}
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
        ))}
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
};
