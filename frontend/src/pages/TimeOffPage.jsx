import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import {
  createTimeOffRequest,
  getTimeOffByStudent,
  deleteTimeOffRequest,
} from "../api/client";
import { Icons } from "../components/Icons";
import { TIME_SLOTS, DAYS } from "../styles/theme";

const styles = {
  page: {
    maxWidth: 700,
    margin: "0 auto",
    padding: "24px 16px",
    fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
  },
  pageHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 800,
    color: "#0F172A",
    margin: 0,
  },
  pageSubtitle: {
    fontSize: 14,
    color: "#64748B",
    margin: "4px 0 0",
  },
  card: {
    background: "#FFF",
    border: "1px solid #E2E8F0",
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 700,
    color: "#1E293B",
    margin: "0 0 16px",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 700,
    color: "#475569",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  dayGroup: {
    display: "flex",
    gap: 0,
    borderRadius: 8,
    overflow: "hidden",
    border: "1.5px solid #CBD5E1",
    marginBottom: 16,
  },
  dayBtn: {
    flex: 1,
    padding: "9px 4px",
    fontSize: 13,
    fontWeight: 600,
    border: "none",
    cursor: "pointer",
    transition: "all 0.15s",
    background: "#FFF",
    color: "#64748B",
    borderRight: "1px solid #E2E8F0",
  },
  dayBtnActive: {
    background: "#0F172A",
    color: "#FFF",
  },
  dayBtnLast: {
    borderRight: "none",
  },
  typeToggle: {
    display: "flex",
    gap: 8,
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "10px 16px",
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 8,
    cursor: "pointer",
    transition: "all 0.15s",
    border: "1.5px solid #CBD5E1",
    background: "#FFF",
    color: "#64748B",
  },
  typeBtnActive: {
    border: "1.5px solid #0F172A",
    background: "#0F172A",
    color: "#FFF",
  },
  slotGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
    gap: 6,
    marginBottom: 16,
  },
  slotBtn: {
    padding: "7px 8px",
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 6,
    border: "1.5px solid #CBD5E1",
    background: "#FFF",
    color: "#475569",
    cursor: "pointer",
    transition: "all 0.15s",
    textAlign: "center",
  },
  slotBtnActive: {
    border: "1.5px solid #0F172A",
    background: "#0F172A",
    color: "#FFF",
  },
  submitBtn: {
    width: "100%",
    padding: "11px 20px",
    fontSize: 14,
    fontWeight: 700,
    color: "#FFF",
    background: "#0F172A",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    transition: "opacity 0.15s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dayGroupHeader: {
    fontSize: 14,
    fontWeight: 700,
    color: "#1E293B",
    margin: "0 0 8px",
    paddingBottom: 8,
    borderBottom: "1px solid #F1F5F9",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  requestRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    borderRadius: 8,
    background: "#F8FAFC",
    marginBottom: 6,
  },
  requestSlot: {
    fontSize: 13,
    fontWeight: 600,
    color: "#334155",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  fullDayBadge: {
    fontSize: 11,
    fontWeight: 700,
    color: "#0F172A",
    background: "#E2E8F0",
    borderRadius: 4,
    padding: "2px 8px",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  deleteBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 6,
    borderRadius: 6,
    color: "#94A3B8",
    display: "flex",
    alignItems: "center",
    transition: "all 0.15s",
  },
  emptyState: {
    textAlign: "center",
    padding: "32px 16px",
  },
  emptyIcon: {
    color: "#CBD5E1",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#64748B",
    margin: "0 0 4px",
  },
  emptySubtext: {
    fontSize: 13,
    color: "#94A3B8",
    margin: 0,
  },
  loadingText: {
    textAlign: "center",
    padding: "20px 0",
    fontSize: 14,
    color: "#64748B",
  },
  dateInput: {
    width: "100%",
    padding: "10px 12px",
    border: "1.5px solid #CBD5E1",
    borderRadius: 8,
    fontSize: 14,
    color: "#1E293B",
    marginBottom: 8,
    boxSizing: "border-box",
    outline: "none",
  },
  dateHint: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 16,
    padding: "4px 0",
  },
  groupLabel: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    fontWeight: 700,
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: "2px solid #E2E8F0",
  },
  reasonInput: {
    width: "100%",
    padding: "10px 12px",
    border: "1.5px solid #CBD5E1",
    borderRadius: 8,
    fontSize: 13,
    color: "#1E293B",
    marginBottom: 16,
    boxSizing: "border-box",
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
  },
  reasonText: {
    fontSize: 12,
    color: "#64748B",
    fontStyle: "italic",
    marginTop: 4,
  },
};

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return `${parseInt(m)}/${parseInt(d)}/${y}`;
}

function RequestRow({ req, deletingId, onDelete }) {
  return (
    <div style={styles.requestRow}>
      <div style={{ flex: 1 }}>
        <span style={styles.requestSlot}>
          {req.slot === "" || req.slot === null ? (
            <span style={styles.fullDayBadge}>Full Day</span>
          ) : (
            <>
              <Icons.Clock /> {req.slot}
            </>
          )}
        </span>
        {req.reason && (
          <div style={styles.reasonText}>{req.reason}</div>
        )}
      </div>
      <button
        onClick={() => onDelete(req.id)}
        disabled={deletingId === req.id}
        style={{
          ...styles.deleteBtn,
          opacity: deletingId === req.id ? 0.4 : 1,
        }}
        title="Remove request"
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#DC2626";
          e.currentTarget.style.background = "#FEF2F2";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "#94A3B8";
          e.currentTarget.style.background = "none";
        }}
      >
        <Icons.Trash />
      </button>
    </div>
  );
}

export default function TimeOffPage({ showToast }) {
  const { user } = useAuth();

  const [selectedDay, setSelectedDay] = useState(DAYS[0]);
  const [timeType, setTimeType] = useState("full"); // "full" | "slots"
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [scheduleMode, setScheduleMode] = useState("recurring"); // "recurring" | "date"
  const [selectedDate, setSelectedDate] = useState("");
  const [reason, setReason] = useState("");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Get the minimum date (today) for the date picker
  const today = new Date().toISOString().split("T")[0];

  // When a specific date is picked, auto-set the day to match
  const handleDateChange = (dateStr) => {
    setSelectedDate(dateStr);
    if (dateStr) {
      const d = new Date(dateStr + "T12:00:00"); // noon to avoid timezone issues
      const dayIndex = d.getDay(); // 0=Sun
      if (dayIndex >= 1 && dayIndex <= 5) {
        setSelectedDay(DAYS[dayIndex - 1]);
      }
    }
  };

  const fetchRequests = useCallback(async () => {
    if (!user?.cwid) return;
    try {
      const data = await getTimeOffByStudent(user.cwid);
      setRequests(data || []);
    } catch {
      showToast("Failed to load time off requests", "error");
    } finally {
      setLoading(false);
    }
  }, [user?.cwid, showToast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const toggleSlot = (slot) => {
    setSelectedSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  };

  const handleSubmit = async () => {
    if (!user?.cwid) return;
    if (timeType === "slots" && selectedSlots.length === 0) {
      showToast("Please select at least one time slot", "error");
      return;
    }
    if (scheduleMode === "date" && !selectedDate) {
      showToast("Please select a date", "error");
      return;
    }
    if (scheduleMode === "date") {
      const d = new Date(selectedDate + "T12:00:00");
      const dayIndex = d.getDay();
      if (dayIndex === 0 || dayIndex === 6) {
        showToast("Please select a weekday (Monday–Friday)", "error");
        return;
      }
    }

    const effectiveDate = scheduleMode === "date" ? selectedDate : null;
    const trimmedReason = reason.trim() || null;

    setSubmitting(true);
    try {
      if (timeType === "full") {
        await createTimeOffRequest({
          cwid: user.cwid,
          day: selectedDay,
          slot: null,
          effective_date: effectiveDate,
          reason: trimmedReason,
        });
        showToast(
          effectiveDate
            ? `Time off scheduled for ${effectiveDate}`
            : "Full day time off request submitted",
          "success"
        );
      } else {
        let succeeded = 0;
        let failed = 0;
        for (const slot of selectedSlots) {
          try {
            await createTimeOffRequest({
              cwid: user.cwid,
              day: selectedDay,
              slot,
              effective_date: effectiveDate,
              reason: trimmedReason,
            });
            succeeded++;
          } catch {
            failed++;
          }
        }

        if (failed === 0) {
          showToast(
            `${succeeded} time off request${succeeded > 1 ? "s" : ""} submitted`,
            "success"
          );
        } else if (succeeded > 0) {
          showToast(
            `${succeeded} submitted, ${failed} failed`,
            "error"
          );
        } else {
          showToast("Failed to submit time off requests", "error");
        }
      }

      setSelectedSlots([]);
      setReason("");
      if (scheduleMode === "date") setSelectedDate("");
      await fetchRequests();
    } catch {
      showToast("Failed to submit time off request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!user?.cwid) return;
    setDeletingId(id);
    try {
      await deleteTimeOffRequest(id, user.cwid);
      showToast("Time off request removed", "success");
      await fetchRequests();
    } catch {
      showToast("Failed to remove time off request", "error");
    } finally {
      setDeletingId(null);
    }
  };

  // Split into recurring and date-specific, then group
  const recurringRequests = requests.filter((r) => !r.effective_date);
  const dateRequests = requests.filter((r) => r.effective_date);

  const groupedRecurring = DAYS.reduce((acc, day) => {
    const dayRequests = recurringRequests.filter((r) => r.day === day);
    if (dayRequests.length > 0) acc[day] = dayRequests;
    return acc;
  }, {});

  // Group date-specific by effective_date
  const groupedDated = {};
  dateRequests.forEach((r) => {
    if (!groupedDated[r.effective_date]) groupedDated[r.effective_date] = [];
    groupedDated[r.effective_date].push(r);
  });
  const sortedDates = Object.keys(groupedDated).sort();

  const hasRequests = recurringRequests.length > 0 || dateRequests.length > 0;

  const canSubmit =
    !submitting &&
    (timeType === "full" || selectedSlots.length > 0) &&
    (scheduleMode === "recurring" || selectedDate) &&
    reason.trim().length > 0;

  return (
    <div style={styles.page}>
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Time Off Requests</h1>
          <p style={styles.pageSubtitle}>
            Request time off from your scheduled shifts
          </p>
        </div>
      </div>

      {/* Request Form */}
      <div style={styles.card}>
        <h2 style={styles.sectionHeader}>
          <Icons.Plus /> New Request
        </h2>

        <label style={styles.label}>Schedule Type</label>
        <div style={styles.typeToggle}>
          <button
            onClick={() => {
              setScheduleMode("recurring");
              setSelectedDate("");
            }}
            style={{
              ...styles.typeBtn,
              ...(scheduleMode === "recurring" ? styles.typeBtnActive : {}),
            }}
          >
            <Icons.Calendar /> Recurring (Weekly)
          </button>
          <button
            onClick={() => setScheduleMode("date")}
            style={{
              ...styles.typeBtn,
              ...(scheduleMode === "date" ? styles.typeBtnActive : {}),
            }}
          >
            <Icons.Clock /> Specific Date
          </button>
        </div>

        {scheduleMode === "date" ? (
          <>
            <label style={styles.label}>Date</label>
            <input
              type="date"
              value={selectedDate}
              min={today}
              onChange={(e) => handleDateChange(e.target.value)}
              style={styles.dateInput}
            />
            {selectedDate && (
              <div style={styles.dateHint}>
                Day: <strong>{selectedDay}</strong>
              </div>
            )}
          </>
        ) : (
          <>
            <label style={styles.label}>Day</label>
            <div style={styles.dayGroup}>
              {DAYS.map((day, i) => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  style={{
                    ...styles.dayBtn,
                    ...(selectedDay === day ? styles.dayBtnActive : {}),
                    ...(i === DAYS.length - 1 ? styles.dayBtnLast : {}),
                  }}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </>
        )}

        <label style={styles.label}>Time</label>
        <div style={styles.typeToggle}>
          <button
            onClick={() => {
              setTimeType("full");
              setSelectedSlots([]);
            }}
            style={{
              ...styles.typeBtn,
              ...(timeType === "full" ? styles.typeBtnActive : {}),
            }}
          >
            <Icons.Calendar /> Full Day
          </button>
          <button
            onClick={() => setTimeType("slots")}
            style={{
              ...styles.typeBtn,
              ...(timeType === "slots" ? styles.typeBtnActive : {}),
            }}
          >
            <Icons.Clock /> Specific Slots
          </button>
        </div>

        {timeType === "slots" && (
          <>
            <label style={styles.label}>Select Slots</label>
            <div style={styles.slotGrid}>
              {TIME_SLOTS.map((slot) => (
                <button
                  key={slot}
                  onClick={() => toggleSlot(slot)}
                  style={{
                    ...styles.slotBtn,
                    ...(selectedSlots.includes(slot)
                      ? styles.slotBtnActive
                      : {}),
                  }}
                >
                  {slot}
                </button>
              ))}
            </div>
          </>
        )}

        <label style={styles.label}>Reason</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Doctor's appointment, class conflict..."
          rows={2}
          style={styles.reasonInput}
        />

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            ...styles.submitBtn,
            opacity: canSubmit ? 1 : 0.5,
            cursor: canSubmit ? "pointer" : "not-allowed",
          }}
        >
          {submitting ? (
            "Submitting..."
          ) : (
            <>
              <Icons.Check /> Submit Request
            </>
          )}
        </button>
      </div>

      {/* Existing Requests */}
      <div style={styles.card}>
        <h2 style={styles.sectionHeader}>
          <Icons.Calendar /> Your Requests
        </h2>

        {loading ? (
          <p style={styles.loadingText}>Loading requests...</p>
        ) : !hasRequests ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
              <Icons.Calendar />
            </div>
            <p style={styles.emptyTitle}>No time off requests yet</p>
            <p style={styles.emptySubtext}>
              Use the form above to request time off from your shifts.
            </p>
          </div>
        ) : (
          <>
            {/* Recurring requests */}
            {Object.keys(groupedRecurring).length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={styles.groupLabel}>
                  <Icons.Calendar /> Recurring (Every Week)
                </div>
                {Object.entries(groupedRecurring).map(([day, dayRequests]) => (
                  <div key={day} style={{ marginBottom: 16 }}>
                    <div style={styles.dayGroupHeader}>
                      <Icons.Calendar /> {day}
                    </div>
                    {dayRequests.map((req) => (
                      <RequestRow
                        key={req.id}
                        req={req}
                        deletingId={deletingId}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Date-specific requests */}
            {sortedDates.length > 0 && (
              <div>
                <div style={styles.groupLabel}>
                  <Icons.Clock /> Scheduled Dates
                </div>
                {sortedDates.map((date) => (
                  <div key={date} style={{ marginBottom: 16 }}>
                    <div style={styles.dayGroupHeader}>
                      <Icons.Calendar /> {formatDate(date)} ({groupedDated[date][0].day})
                    </div>
                    {groupedDated[date].map((req) => (
                      <RequestRow
                        key={req.id}
                        req={req}
                        deletingId={deletingId}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
