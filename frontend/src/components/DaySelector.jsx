import { DAYS } from "../styles/theme";

const SHORT_DAYS = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri" };

const styles = {
  dayBar: {
    display: "flex",
    gap: 6,
    padding: "12px 24px",
    background: "#FFF",
    borderBottom: "1px solid #E2E8F0",
  },
  dayBtn: {
    padding: "8px 20px",
    fontSize: 13,
    fontWeight: 600,
    border: "1px solid #E2E8F0",
    borderRadius: 8,
    background: "#FFF",
    color: "#64748B",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  dayBtnActive: {
    background: "#0F172A",
    color: "#FFF",
    borderColor: "#0F172A",
  },
};

export default function DaySelector({ selectedDay, onSelect }) {
  return (
    <div className="day-bar" style={styles.dayBar}>
      {DAYS.map((d) => (
        <button
          key={d}
          className="day-btn"
          onClick={() => onSelect(d)}
          style={{
            ...styles.dayBtn,
            ...(d === selectedDay ? styles.dayBtnActive : {}),
          }}
        >
          <span className="day-full">{d}</span>
          <span className="day-short" style={{ display: "none" }}>{SHORT_DAYS[d]}</span>
        </button>
      ))}
    </div>
  );
}
