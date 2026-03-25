import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getAllTeams,
  getScheduleByDay,
  getAssignmentsByStudent,
  getScheduleLock,
  signUpForSlot,
  removeFromSlot,
  autofillFromDay,
  getAllTeamHours,
} from "../api/client";
import { Icons } from "../components/Icons";
import { DAYS, teamColors, buildTeamHoursMap, getVisibleSlots, isSlotActiveForTeam } from "../styles/theme";

export default function SignUpPage({ day, showToast }) {
  const { user } = useAuth();

  const [teams, setTeams] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedSlot, setExpandedSlot] = useState(null);
  const [autofillSource, setAutofillSource] = useState("");
  const [showAutofillConfirm, setShowAutofillConfirm] = useState(false);
  const [otherDayShiftCounts, setOtherDayShiftCounts] = useState({});
  const [togglingSlot, setTogglingSlot] = useState(null);
  const [autofilling, setAutofilling] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [teamHoursMap, setTeamHoursMap] = useState({});

  // Stable fetch function for schedule data
  const fetchSchedule = useCallback(async () => {
    try {
      const data = await getScheduleByDay(day);
      setSchedule(data || []);
    } catch {
      setSchedule([]);
    }
  }, [day]);

  // Initial data load when day changes
  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      setLoading(true);
      setExpandedSlot(null);
      setAutofillSource("");
      setShowAutofillConfirm(false);

      try {
        const [teamsData, scheduleData, assignmentsData, lockData, teamHoursData] =
          await Promise.all([
            getAllTeams(),
            getScheduleByDay(day),
            getAssignmentsByStudent(user.cwid),
            getScheduleLock(),
            getAllTeamHours(),
          ]);

        if (cancelled) return;

        setTeams(teamsData || []);
        setSchedule(scheduleData || []);
        setAssignments(assignmentsData || []);
        setLocked(lockData?.locked ?? false);
        setTeamHoursMap(buildTeamHoursMap(teamHoursData || []));
      } catch {
        if (!cancelled) {
          showToast("Failed to load schedule data", "error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAll();
    return () => {
      cancelled = true;
    };
  }, [day, user.cwid, showToast]);

  // Fetch shift counts for other days (for autofill dropdown)
  useEffect(() => {
    let cancelled = false;

    async function loadOtherDayCounts() {
      const otherDays = DAYS.filter((d) => d !== day);
      const counts = {};

      await Promise.all(
        otherDays.map(async (d) => {
          try {
            const data = await getScheduleByDay(d);
            counts[d] = (data || []).filter(
              (entry) => entry.cwid === user.cwid
            ).length;
          } catch {
            counts[d] = 0;
          }
        })
      );

      if (!cancelled) setOtherDayShiftCounts(counts);
    }

    loadOtherDayCounts();
    return () => {
      cancelled = true;
    };
  }, [day, user.cwid]);

  // Derived data
  const assignedTeamIds = new Set(assignments.map((a) => a.team_id));

  const getSlotCount = (teamId, slot) => {
    return schedule.filter(
      (entry) => entry.team_id === teamId && entry.slot === slot
    ).length;
  };

  const isSignedUp = (teamId, slot) => {
    return schedule.some(
      (entry) =>
        entry.cwid === user.cwid &&
        entry.team_id === teamId &&
        entry.slot === slot
    );
  };

  const getSlotStudents = (teamId, slot) => {
    return schedule.filter(
      (entry) => entry.team_id === teamId && entry.slot === slot
    );
  };

  const visibleSlots = getVisibleSlots(teamHoursMap, teams, day);

  const myShifts = [];
  teams.forEach((team) => {
    visibleSlots.forEach((slot) => {
      if (isSignedUp(team.id, slot)) {
        myShifts.push({ slot, team });
      }
    });
  });

  // Handlers
  const handleToggleSlot = useCallback(
    async (teamId, slot) => {
      if (locked) return;
      const currently = isSignedUp(teamId, slot);
      const slotKey = `${teamId}|${slot}`;
      setTogglingSlot(slotKey);

      try {
        if (currently) {
          await removeFromSlot({
            cwid: user.cwid,
            team_id: teamId,
            day,
            slot,
          });
          showToast("Removed from shift", "success");
        } else {
          await signUpForSlot({
            cwid: user.cwid,
            team_id: teamId,
            day,
            slot,
          });
          showToast("Signed up for shift", "success");
        }
        await fetchSchedule();
      } catch (err) {
        const msg = err.message || "Action failed";
        showToast(msg, "error");
      } finally {
        setTogglingSlot(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locked, schedule, user.cwid, day, showToast, fetchSchedule]
  );

  const handleAutofill = useCallback(async () => {
    if (!autofillSource) return;
    setAutofilling(true);

    try {
      const result = await autofillFromDay({
        cwid: user.cwid,
        source_day: autofillSource,
        target_day: day,
      });

      const { added, skipped } = result;
      setShowAutofillConfirm(false);
      setAutofillSource("");

      if (added === 0 && skipped === 0) {
        showToast("No shifts to copy from " + autofillSource, "error");
      } else if (added > 0 && skipped > 0) {
        showToast(
          `Copied ${added} shift${added > 1 ? "s" : ""}, ${skipped} skipped (full)`
        );
      } else if (skipped > 0) {
        showToast(
          `All ${skipped} shift${skipped > 1 ? "s" : ""} skipped -- slots full`,
          "error"
        );
      } else {
        showToast(
          `Copied ${added} shift${added > 1 ? "s" : ""} from ${autofillSource}`
        );
      }

      await fetchSchedule();
    } catch (err) {
      showToast(err.message || "Autofill failed", "error");
    } finally {
      setAutofilling(false);
    }
  }, [autofillSource, user.cwid, day, showToast, fetchSchedule]);

  const handleClearSchedule = useCallback(async () => {
    if (locked || myShifts.length === 0) return;
    setClearing(true);

    let removed = 0;
    let failed = 0;
    for (const shift of myShifts) {
      try {
        await removeFromSlot({
          cwid: user.cwid,
          team_id: shift.team.id,
          day,
          slot: shift.slot,
        });
        removed++;
      } catch {
        failed++;
      }
    }

    await fetchSchedule();
    setShowClearConfirm(false);
    setClearing(false);

    if (failed === 0) {
      showToast(`Cleared ${removed} shift${removed > 1 ? "s" : ""} from ${day}`);
    } else {
      showToast(`Removed ${removed}, ${failed} failed`, "error");
    }
  }, [locked, myShifts, user.cwid, day, fetchSchedule, showToast]);

  const otherDays = DAYS.filter((d) => d !== day);
  const gridCols = `130px ${teams.map(() => "1fr").join(" ")}`;
  const expandedGridCols = teams.map(() => "1fr").join(" ");
  const hasAssignments = assignments.length > 0;

  // Weekly hours: current day shifts + other day shift counts
  const todayShiftCount = myShifts.length;
  const otherDaysTotalShifts = Object.values(otherDayShiftCounts).reduce(
    (sum, c) => sum + c,
    0
  );
  const totalWeeklySlots = todayShiftCount + otherDaysTotalShifts;
  const totalWeeklyHours = totalWeeklySlots * 0.5;

  // Loading state
  if (loading) {
    return (
      <div style={styles.signupLayout}>
        <div style={styles.loadingWrap}>
          <div style={styles.loadingText}>Loading schedule...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.signupLayout}>
      {/* Schedule Lock Banner */}
      {locked && (
        <div style={styles.lockBanner}>
          <Icons.Lock />
          <span>
            Schedule is locked -- contact an admin to make changes
          </span>
        </div>
      )}

      {/* No Assignments Warning */}
      {!hasAssignments && (
        <div style={styles.noAssignmentsBanner}>
          <Icons.AlertCircle />
          <span>
            You are not assigned to any teams. Contact an admin to get assigned
            before signing up for shifts.
          </span>
        </div>
      )}

      {/* Shift Summary Bar */}
      {myShifts.length > 0 && (
        <div style={styles.myShiftsBar}>
          <div style={styles.myShiftsTop}>
            <strong>Your {day} shifts:</strong>
            {!locked && !showClearConfirm && (
              <button
                onClick={() => setShowClearConfirm(true)}
                style={styles.clearBtn}
              >
                <Icons.Trash /> Clear {day}
              </button>
            )}
          </div>
          <div style={styles.myShiftTags}>
            {myShifts.map((s, i) => {
              const colors = teamColors(s.team.color, i);
              return (
                <span
                  key={i}
                  style={{
                    ...styles.myShiftTag,
                    background: colors.tag,
                  }}
                >
                  {s.slot} &middot; {s.team.name}
                </span>
              );
            })}
          </div>
          {showClearConfirm && (
            <div style={styles.clearConfirm}>
              <Icons.AlertCircle />
              <span style={{ fontSize: 12 }}>
                Remove all {myShifts.length} shift{myShifts.length > 1 ? "s" : ""} from {day}?
              </span>
              <button
                onClick={handleClearSchedule}
                disabled={clearing}
                style={styles.clearConfirmBtn}
              >
                {clearing ? "Clearing..." : "Yes, clear all"}
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                disabled={clearing}
                style={styles.clearCancelBtn}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Weekly Hours */}
      <div style={styles.weeklyHoursBar}>
        <Icons.Clock />
        <span style={{ fontWeight: 700 }}>Weekly Hours:</span>
        <span style={styles.weeklyHoursValue}>
          {totalWeeklyHours % 1 === 0
            ? totalWeeklyHours
            : totalWeeklyHours.toFixed(1)}{" "}
          hrs
        </span>
        <span style={styles.weeklyHoursBreakdown}>
          ({todayShiftCount} slot{todayShiftCount !== 1 ? "s" : ""} {day}
          {otherDaysTotalShifts > 0 &&
            ` + ${otherDaysTotalShifts} other`})
        </span>
      </div>

      {/* Autofill Bar */}
      {hasAssignments && !locked && (
        <div style={styles.autofillBar}>
          <div style={styles.autofillLeft}>
            <Icons.Copy />
            <span style={{ fontWeight: 600, fontSize: 13 }}>
              Copy shifts from:
            </span>
            <select
              value={autofillSource}
              onChange={(e) => {
                setAutofillSource(e.target.value);
                setShowAutofillConfirm(false);
              }}
              style={styles.autofillSelect}
            >
              <option value="">Select a day...</option>
              {otherDays.map((d) => {
                const count = otherDayShiftCounts[d] ?? 0;
                return (
                  <option key={d} value={d} disabled={count === 0}>
                    {d}{" "}
                    {count > 0
                      ? `(${count} shift${count > 1 ? "s" : ""})`
                      : "(no shifts)"}
                  </option>
                );
              })}
            </select>
            {autofillSource && !showAutofillConfirm && (
              <button
                onClick={() => setShowAutofillConfirm(true)}
                style={styles.autofillBtn}
              >
                Apply to {day}
              </button>
            )}
          </div>
          {showAutofillConfirm && autofillSource && (
            <div style={styles.autofillConfirm}>
              <Icons.AlertCircle />
              <span style={{ fontSize: 12 }}>
                Copy your {autofillSource} shifts to {day}? (Full slots will be
                skipped)
              </span>
              <button
                onClick={handleAutofill}
                style={styles.autofillConfirmBtn}
                disabled={autofilling}
              >
                {autofilling ? "Copying..." : "Confirm"}
              </button>
              <button
                onClick={() => setShowAutofillConfirm(false)}
                style={styles.autofillCancelBtn}
                disabled={autofilling}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Schedule Grid */}
      <div style={styles.signupGrid}>
        {/* Header */}
        <div style={{ ...styles.gridHeader, gridTemplateColumns: gridCols }}>
          <div style={styles.gridTimeHeader}>Time</div>
          {teams.map((team, idx) => {
            const colors = teamColors(team.color, idx);
            const isAssigned = assignedTeamIds.has(team.id);
            return (
              <div
                key={team.id}
                style={{
                  ...styles.gridTeamHeader,
                  borderBottom: `3px solid ${colors.border}`,
                  opacity: isAssigned ? 1 : 0.5,
                }}
              >
                {team.name}
                {!isAssigned && (
                  <div style={styles.viewOnlyLabel}>(view only)</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Rows */}
        {visibleSlots.map((slot, slotIdx) => {
          const isExpanded = expandedSlot === slot;
          return (
            <div key={slot}>
              <div
                style={{
                  ...styles.gridRow,
                  gridTemplateColumns: gridCols,
                  background: slotIdx % 2 === 0 ? "#FAFAFA" : "#FFF",
                }}
              >
                {/* Time cell */}
                <div
                  style={styles.gridTimeCell}
                  onClick={() =>
                    setExpandedSlot(isExpanded ? null : slot)
                  }
                >
                  <span style={styles.timeText}>{slot}</span>
                  <span
                    style={{
                      ...styles.expandIcon,
                      transform: isExpanded
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                    }}
                  >
                    <Icons.ChevronDown />
                  </span>
                </div>

                {/* Team cells */}
                {teams.map((team, teamIdx) => {
                  const colors = teamColors(team.color, teamIdx);
                  const active = isSlotActiveForTeam(slot, team.id, day, teamHoursMap);
                  const count = getSlotCount(team.id, slot);
                  const full = count >= team.max_per_slot;
                  const mine = isSignedUp(team.id, slot);
                  const isAssigned = assignedTeamIds.has(team.id);
                  const disabled =
                    locked || !isAssigned || !active || (full && !mine);
                  const isToggling =
                    togglingSlot === `${team.id}|${slot}`;

                  if (!active) {
                    return (
                      <div key={team.id} style={styles.gridCell}>
                        <div style={{
                          ...styles.slotBtn,
                          background: "#F1F5F9",
                          borderColor: "#E2E8F0",
                          opacity: 0.3,
                          cursor: "default",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}>
                          <span style={{ color: "#94A3B8", fontSize: 11 }}>&mdash;</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={team.id} style={styles.gridCell}>
                      <button
                        onClick={() => handleToggleSlot(team.id, slot)}
                        disabled={disabled || isToggling}
                        style={{
                          ...styles.slotBtn,
                          background: mine
                            ? colors.bg
                            : full
                              ? "#F1F5F9"
                              : "#FFF",
                          borderColor: mine
                            ? colors.border
                            : full
                              ? "#E2E8F0"
                              : "#CBD5E1",
                          cursor: disabled
                            ? "not-allowed"
                            : "pointer",
                          opacity:
                            !isAssigned
                              ? 0.4
                              : full && !mine
                                ? 0.6
                                : isToggling
                                  ? 0.7
                                  : 1,
                        }}
                      >
                        {mine ? (
                          <span
                            style={{
                              color: colors.text,
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Icons.Check /> Signed Up
                          </span>
                        ) : full ? (
                          <span
                            style={{
                              color: "#94A3B8",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Icons.Lock /> Full
                          </span>
                        ) : (
                          <span
                            style={{
                              color: "#475569",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <span style={styles.capacityDots}>
                              {Array.from({
                                length: team.max_per_slot,
                              }).map((_, i) => (
                                <span
                                  key={i}
                                  style={{
                                    ...styles.dot,
                                    background:
                                      i < count
                                        ? colors.border
                                        : "#E2E8F0",
                                  }}
                                />
                              ))}
                            </span>
                            {count}/{team.max_per_slot}
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Expanded Slot Detail */}
              {isExpanded && (
                <div
                  style={{
                    ...styles.expandedRow,
                    gridTemplateColumns: expandedGridCols,
                  }}
                >
                  {teams.map((team, teamIdx) => {
                    const colors = teamColors(team.color, teamIdx);
                    const students = getSlotStudents(team.id, slot);
                    return (
                      <div key={team.id} style={styles.expandedTeam}>
                        <div
                          style={{
                            ...styles.expandedTeamLabel,
                            color: colors.text,
                          }}
                        >
                          {team.name}
                        </div>
                        {students.length === 0 ? (
                          <span style={styles.emptySlot}>
                            No one yet
                          </span>
                        ) : (
                          students.map((entry, i) => (
                            <div key={i} style={styles.studentName}>
                              <Icons.User />{" "}
                              {entry.student_name || entry.cwid}
                            </div>
                          ))
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  signupLayout: {
    maxWidth: 960,
    margin: "0 auto",
    fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
  },
  loadingWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 0",
  },
  loadingText: {
    fontSize: 14,
    fontWeight: 600,
    color: "#64748B",
  },

  // Lock Banner
  lockBanner: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 16px",
    background: "#FFFBEB",
    border: "1px solid #FDE68A",
    borderRadius: 10,
    marginBottom: 16,
    color: "#92400E",
    fontSize: 13,
    fontWeight: 600,
  },

  // No Assignments Warning
  noAssignmentsBanner: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 16px",
    background: "#FFFBEB",
    border: "1px solid #FDE68A",
    borderRadius: 10,
    marginBottom: 16,
    color: "#92400E",
    fontSize: 13,
    fontWeight: 500,
  },

  // Shift Summary
  myShiftsBar: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: "12px 16px",
    background: "#FFF",
    borderRadius: 10,
    border: "1px solid #E2E8F0",
    marginBottom: 16,
    fontSize: 13,
    fontWeight: 500,
  },
  myShiftsTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  myShiftTags: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  myShiftTag: {
    padding: "3px 10px",
    borderRadius: 6,
    color: "#FFF",
    fontSize: 12,
    fontWeight: 700,
  },
  clearBtn: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: 600,
    border: "1px solid #E2E8F0",
    borderRadius: 6,
    background: "#FFF",
    color: "#DC2626",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  clearConfirm: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    background: "#FEF2F2",
    border: "1px solid #FECACA",
    borderRadius: 8,
    color: "#991B1B",
  },
  clearConfirmBtn: {
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: 700,
    border: "none",
    borderRadius: 6,
    background: "#DC2626",
    color: "#FFF",
    cursor: "pointer",
    marginLeft: "auto",
    fontFamily: "inherit",
  },
  clearCancelBtn: {
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: 600,
    border: "1px solid #D1D5DB",
    borderRadius: 6,
    background: "#FFF",
    color: "#64748B",
    cursor: "pointer",
    fontFamily: "inherit",
  },

  // Weekly hours
  weeklyHoursBar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 16px",
    background: "#FFF",
    borderRadius: 10,
    border: "1px solid #E2E8F0",
    marginBottom: 16,
    fontSize: 13,
    color: "#475569",
  },
  weeklyHoursValue: {
    fontSize: 18,
    fontWeight: 800,
    color: "#0F172A",
  },
  weeklyHoursBreakdown: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: 500,
  },

  // Autofill bar
  autofillBar: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: "10px 16px",
    background: "#FFF",
    borderRadius: 10,
    border: "1px solid #E2E8F0",
    marginBottom: 16,
  },
  autofillLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "#475569",
    flexWrap: "wrap",
  },
  autofillSelect: {
    padding: "6px 10px",
    fontSize: 13,
    fontWeight: 500,
    border: "1.5px solid #CBD5E1",
    borderRadius: 7,
    background: "#F8FAFC",
    color: "#1E293B",
    cursor: "pointer",
    outline: "none",
  },
  autofillBtn: {
    padding: "6px 14px",
    fontSize: 12,
    fontWeight: 700,
    border: "none",
    borderRadius: 7,
    background: "#0F172A",
    color: "#FFF",
    cursor: "pointer",
  },
  autofillConfirm: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    background: "#FFFBEB",
    border: "1px solid #FDE68A",
    borderRadius: 8,
    color: "#92400E",
  },
  autofillConfirmBtn: {
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: 700,
    border: "none",
    borderRadius: 6,
    background: "#16A34A",
    color: "#FFF",
    cursor: "pointer",
    marginLeft: "auto",
  },
  autofillCancelBtn: {
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: 600,
    border: "1px solid #D1D5DB",
    borderRadius: 6,
    background: "#FFF",
    color: "#64748B",
    cursor: "pointer",
  },

  // Grid
  signupGrid: {
    background: "#FFF",
    borderRadius: 12,
    border: "1px solid #E2E8F0",
    overflow: "hidden",
  },
  gridHeader: {
    display: "grid",
    borderBottom: "2px solid #E2E8F0",
  },
  gridTimeHeader: {
    padding: "12px 16px",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#94A3B8",
  },
  gridTeamHeader: {
    padding: "12px 16px",
    fontSize: 13,
    fontWeight: 700,
    color: "#1E293B",
    textAlign: "center",
  },
  viewOnlyLabel: {
    fontSize: 10,
    fontWeight: 500,
    color: "#94A3B8",
    marginTop: 2,
  },
  gridRow: {
    display: "grid",
    borderBottom: "1px solid #F1F5F9",
    alignItems: "center",
    minHeight: 48,
  },
  gridTimeCell: {
    padding: "8px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer",
    userSelect: "none",
  },
  timeText: { fontSize: 13, fontWeight: 600, color: "#334155" },
  expandIcon: { transition: "transform 0.2s", color: "#94A3B8" },
  gridCell: {
    padding: "6px 8px",
    display: "flex",
    justifyContent: "center",
  },
  slotBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    width: "100%",
    maxWidth: 180,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 600,
    border: "2px solid",
    borderRadius: 8,
    background: "#FFF",
    transition: "all 0.15s",
    fontFamily: "inherit",
  },
  capacityDots: { display: "flex", gap: 3 },
  dot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    transition: "background 0.15s",
  },

  // Expanded row
  expandedRow: {
    display: "grid",
    marginLeft: 130,
    padding: "8px 12px 12px",
    borderBottom: "1px solid #E2E8F0",
    background: "#F8FAFC",
    gap: 12,
  },
  expandedTeam: { padding: "4px 8px" },
  expandedTeamLabel: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 6,
  },
  studentName: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    color: "#334155",
    padding: "3px 0",
  },
  emptySlot: { fontSize: 12, color: "#CBD5E1", fontStyle: "italic" },
};
