import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { createTimeclockRequest, getTimeclockByStudent } from "../api/client";

function formatTime12(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${parseInt(m)}/${parseInt(d)}/${y}`;
}

export default function TimeclockPage({ showToast }) {
  const { user } = useAuth();
  const [shiftDate, setShiftDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    if (!user?.cwid) return;
    try {
      const data = await getTimeclockByStudent(user.cwid);
      setRequests(data || []);
    } catch {
      console.error("Failed to load timeclock requests");
    } finally {
      setLoading(false);
    }
  }, [user?.cwid]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!shiftDate || !startTime || !endTime || !reason.trim()) {
      showToast("All fields are required", "error");
      return;
    }
    setSubmitting(true);
    try {
      await createTimeclockRequest({
        cwid: user.cwid,
        shift_date: shiftDate,
        start_time: startTime,
        end_time: endTime,
        reason: reason.trim(),
      });
      showToast("Timeclock correction submitted", "success");
      setShiftDate("");
      setStartTime("");
      setEndTime("");
      setReason("");
      await fetchRequests();
    } catch (err) {
      showToast("Failed to submit: " + err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading...</div>;
  }

  return (
    <div style={styles.pageWrap}>
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Timeclock Correction Request</h2>
        <p style={styles.cardDesc}>
          Forgot to clock in or out? Submit a correction request and an admin will update your timesheet.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Shift Date</label>
              <input
                type="date"
                value={shiftDate}
                onChange={(e) => setShiftDate(e.target.value)}
                style={styles.input}
                required
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={styles.input}
                required
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={styles.input}
                required
              />
            </div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Reason / Notes</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain what happened (e.g., forgot to clock in, system was down...)"
              style={styles.textarea}
              rows={3}
              required
            />
          </div>
          <button type="submit" disabled={submitting} style={{
            ...styles.submitBtn,
            opacity: submitting ? 0.6 : 1,
          }}>
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>My Requests</h3>
        {requests.length === 0 ? (
          <p style={styles.empty}>No timeclock correction requests yet.</p>
        ) : (
          <div style={styles.requestList}>
            {requests.map((req) => (
              <div key={req.id} style={{
                ...styles.requestCard,
                borderLeftColor: req.status === "fixed" ? "#22c55e" : "#f59e0b",
              }}>
                <div style={styles.requestHeader}>
                  <span style={styles.requestDate}>{formatDate(req.shift_date)}</span>
                  <span style={{
                    ...styles.statusBadge,
                    background: req.status === "fixed" ? "#DCFCE7" : "#FEF3C7",
                    color: req.status === "fixed" ? "#16A34A" : "#92400E",
                  }}>
                    {req.status === "fixed" ? "Fixed" : "Pending"}
                  </span>
                </div>
                <div style={styles.requestTime}>
                  {formatTime12(req.start_time)} &ndash; {formatTime12(req.end_time)}
                </div>
                <div style={styles.requestReason}>{req.reason}</div>
                {req.status === "fixed" && req.admin_notes && (
                  <div style={styles.adminNote}>
                    Admin note: {req.admin_notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  pageWrap: {
    maxWidth: 700,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  loading: {
    textAlign: "center",
    padding: 60,
    color: "#64748B",
    fontSize: 14,
    fontWeight: 600,
  },
  card: {
    background: "#FFF",
    borderRadius: 12,
    border: "1px solid #E2E8F0",
    padding: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "#0F172A",
    margin: "0 0 4px",
  },
  cardDesc: {
    fontSize: 13,
    color: "#64748B",
    margin: "0 0 20px",
    lineHeight: 1.5,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  formRow: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    flex: 1,
    minWidth: 160,
  },
  label: {
    fontSize: 12,
    fontWeight: 700,
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  input: {
    padding: "10px 12px",
    border: "1.5px solid #CBD5E1",
    borderRadius: 8,
    fontSize: 14,
    color: "#1E293B",
    outline: "none",
    fontFamily: "inherit",
    background: "#FFF",
  },
  textarea: {
    padding: "10px 12px",
    border: "1.5px solid #CBD5E1",
    borderRadius: 8,
    fontSize: 14,
    color: "#1E293B",
    outline: "none",
    fontFamily: "inherit",
    resize: "vertical",
    background: "#FFF",
  },
  submitBtn: {
    padding: "10px 20px",
    background: "#0F172A",
    color: "#FFF",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    alignSelf: "flex-start",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#0F172A",
    margin: "0 0 16px",
  },
  empty: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    padding: "24px 0",
    margin: 0,
  },
  requestList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  requestCard: {
    padding: "14px 16px",
    background: "#F8FAFC",
    borderRadius: 10,
    borderLeft: "4px solid",
  },
  requestHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  requestDate: {
    fontSize: 14,
    fontWeight: 700,
    color: "#0F172A",
  },
  statusBadge: {
    display: "inline-block",
    padding: "3px 10px",
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 12,
  },
  requestTime: {
    fontSize: 13,
    fontFamily: "monospace",
    color: "#475569",
    marginBottom: 6,
  },
  requestReason: {
    fontSize: 13,
    color: "#64748B",
    fontStyle: "italic",
    lineHeight: 1.4,
  },
  adminNote: {
    fontSize: 12,
    color: "#16A34A",
    marginTop: 8,
    padding: "6px 10px",
    background: "#F0FDF4",
    borderRadius: 6,
    border: "1px solid #BBF7D0",
  },
};
