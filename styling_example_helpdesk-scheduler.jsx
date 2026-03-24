import { useState, useEffect, useCallback } from "react";

// --- DATA ---
const TEAMS = ["Customer Support", "Client Support", "Call Center"];
const TEAM_COLORS = {
  "Customer Support": { bg: "#DBEAFE", border: "#3B82F6", text: "#1E40AF", tag: "#2563EB" },
  "Client Support": { bg: "#FCE4EC", border: "#E91E63", text: "#880E4F", tag: "#D81B60" },
  "Call Center": { bg: "#FFF9C4", border: "#F9A825", text: "#795548", tag: "#F57F17" },
};
const MAX_PER_TEAM = 3;
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const TIME_SLOTS = [];
for (let h = 8; h < 17; h++) {
  for (let m = 0; m < 60; m += 30) {
    if (h === 16 && m === 30) {
      TIME_SLOTS.push("4:30 - 5:00");
      continue;
    }
    const startH = h > 12 ? h - 12 : h;
    const endMin = m === 30 ? "00" : "30";
    const endH = m === 30 ? (h + 1 > 12 ? h + 1 - 12 : h + 1) : (h > 12 ? h - 12 : h);
    TIME_SLOTS.push(`${startH}:${m === 0 ? "00" : "30"} - ${endH}:${endMin}`);
  }
}

const STUDENTS_DB = [
  { cwid: "10398469", name: "Aidan Schaubhut" },
  { cwid: "10386365", name: "Xander Joubert" },
  { cwid: "10393357", name: "Carterious Burns" },
  { cwid: "10404211", name: "Daneal Findlay" },
  { cwid: "10410889", name: "Sujit Lopchan" },
  { cwid: "10398454", name: "Robert St. Romain" },
  { cwid: "10407608", name: "Jackson Drouillard" },
  { cwid: "10394654", name: "Thomas Gordon" },
  { cwid: "10411090", name: "Trey Harrelson" },
  { cwid: "10400432", name: "Dylan Ronquille" },
  { cwid: "10420315", name: "Sehat Mahde" },
  { cwid: "10421163", name: "Anoj Bartaula" },
  { cwid: "10406273", name: "Jackson Phelps" },
  { cwid: "10408867", name: "Mark Masenda" },
  { cwid: "10404778", name: "William K" },
  { cwid: "10403662", name: "Jasmine Johnson" },
  { cwid: "10406955", name: "Cyara Darby" },
  { cwid: "10400925", name: "Arin Banks" },
];

// Seed some sample data matching the schedule images
function getSeedData() {
  const data = {};
  const seed = [
    ["Monday", "8:00 - 8:30", "Customer Support", ["10404211", "10406273"]],
    ["Monday", "8:00 - 8:30", "Client Support", ["10398454", "10421163"]],
    ["Monday", "8:00 - 8:30", "Call Center", ["10406955"]],
    ["Monday", "8:30 - 9:00", "Customer Support", ["10404211", "10406273"]],
    ["Monday", "8:30 - 9:00", "Client Support", ["10398454", "10410889", "10421163"]],
    ["Monday", "8:30 - 9:00", "Call Center", ["10406955"]],
    ["Monday", "9:00 - 9:30", "Customer Support", ["10404778", "10406273"]],
    ["Monday", "9:00 - 9:30", "Client Support", ["10398454", "10410889", "10421163"]],
    ["Monday", "9:00 - 9:30", "Call Center", ["10406955"]],
  ];
  seed.forEach(([day, slot, team, cwids]) => {
    cwids.forEach((cwid) => {
      const key = `${day}|${slot}|${team}|${cwid}`;
      data[key] = true;
    });
  });
  return data;
}

// --- ICONS (inline SVG) ---
const Icons = {
  Lock: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
  ),
  Check: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
  ),
  User: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  ),
  Calendar: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  ),
  Grid: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
  ),
  LogOut: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
  ),
  ChevronDown: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
  ),
  Users: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  ),
  Copy: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
  ),
  AlertCircle: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
  ),
};

// --- MAIN APP ---
export default function App() {
  const [user, setUser] = useState(null);
  const [schedule, setSchedule] = useState(getSeedData);
  const [view, setView] = useState("signup"); // signup | admin
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2400);
  }, []);

  const getSlotCount = (day, slot, team) => {
    return Object.keys(schedule).filter(
      (k) => k.startsWith(`${day}|${slot}|${team}|`) && schedule[k]
    ).length;
  };

  const getSlotStudents = (day, slot, team) => {
    return Object.keys(schedule)
      .filter((k) => k.startsWith(`${day}|${slot}|${team}|`) && schedule[k])
      .map((k) => {
        const cwid = k.split("|")[3];
        const s = STUDENTS_DB.find((st) => st.cwid === cwid);
        return s ? s.name : cwid;
      });
  };

  const isSignedUp = (day, slot, team) => {
    if (!user) return false;
    return !!schedule[`${day}|${slot}|${team}|${user.cwid}`];
  };

  const toggleSlot = (day, slot, team) => {
    if (!user) return;
    const key = `${day}|${slot}|${team}|${user.cwid}`;
    const currentlySignedUp = !!schedule[key];
    if (!currentlySignedUp && getSlotCount(day, slot, team) >= MAX_PER_TEAM) {
      showToast("Shift is full — max 3 per team.", "error");
      return;
    }
    setSchedule((prev) => {
      const next = { ...prev };
      if (currentlySignedUp) {
        delete next[key];
      } else {
        next[key] = true;
      }
      return next;
    });
    showToast(currentlySignedUp ? "Removed from shift" : "Signed up for shift");
  };

  const autofillFromDay = (sourceDay, targetDay) => {
    if (!user || sourceDay === targetDay) return { added: 0, skipped: 0 };
    const sourceKeys = Object.keys(schedule).filter(
      (k) => k.startsWith(`${sourceDay}|`) && k.endsWith(`|${user.cwid}`) && schedule[k]
    );
    if (sourceKeys.length === 0) return { added: 0, skipped: 0 };

    // Pre-compute against current schedule
    let added = 0;
    let skipped = 0;
    const keysToAdd = [];

    sourceKeys.forEach((srcKey) => {
      const parts = srcKey.split("|");
      const slot = parts[1];
      const team = parts[2];
      const targetKey = `${targetDay}|${slot}|${team}|${user.cwid}`;
      if (schedule[targetKey]) return; // already signed up
      const count = Object.keys(schedule).filter(
        (k) => k.startsWith(`${targetDay}|${slot}|${team}|`) && schedule[k]
      ).length;
      if (count >= MAX_PER_TEAM) {
        skipped++;
        return;
      }
      keysToAdd.push(targetKey);
      added++;
    });

    if (keysToAdd.length > 0) {
      setSchedule((prev) => {
        const next = { ...prev };
        keysToAdd.forEach((k) => { next[k] = true; });
        return next;
      });
    }

    return { added, skipped };
  };

  if (!user) return <LoginScreen onLogin={setUser} />;

  return (
    <div style={styles.shell}>
      {/* NAV */}
      <nav style={styles.nav}>
        <div style={styles.navLeft}>
          <span style={styles.logo}>LA TECH</span>
          <span style={styles.logoSub}>IT Help Desk</span>
        </div>
        <div style={styles.navTabs}>
          <button
            onClick={() => setView("signup")}
            style={{
              ...styles.navTab,
              ...(view === "signup" ? styles.navTabActive : {}),
            }}
          >
            <Icons.Calendar /> Sign Up
          </button>
          <button
            onClick={() => setView("admin")}
            style={{
              ...styles.navTab,
              ...(view === "admin" ? styles.navTabActive : {}),
            }}
          >
            <Icons.Grid /> Schedule View
          </button>
        </div>
        <div style={styles.navRight}>
          <div style={styles.userBadge}>
            <Icons.User />
            <span>{user.name.split(" ")[0]}</span>
          </div>
          <button onClick={() => setUser(null)} style={styles.logoutBtn}>
            <Icons.LogOut />
          </button>
        </div>
      </nav>

      {/* DAY SELECTOR */}
      <div style={styles.dayBar}>
        {DAYS.map((d) => (
          <button
            key={d}
            onClick={() => setSelectedDay(d)}
            style={{
              ...styles.dayBtn,
              ...(d === selectedDay ? styles.dayBtnActive : {}),
            }}
          >
            {d}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div style={styles.content}>
        {view === "signup" ? (
          <SignUpView
            day={selectedDay}
            user={user}
            getSlotCount={getSlotCount}
            isSignedUp={isSignedUp}
            toggleSlot={toggleSlot}
            getSlotStudents={getSlotStudents}
            autofillFromDay={autofillFromDay}
            showToast={showToast}
            schedule={schedule}
          />
        ) : (
          <AdminView
            day={selectedDay}
            getSlotStudents={getSlotStudents}
            getSlotCount={getSlotCount}
          />
        )}
      </div>

      {/* TOAST */}
      {toast && (
        <div
          style={{
            ...styles.toast,
            background: toast.type === "error" ? "#DC2626" : "#16A34A",
          }}
        >
          {toast.type === "error" ? "✕" : "✓"} {toast.msg}
        </div>
      )}
    </div>
  );
}

// --- LOGIN ---
function LoginScreen({ onLogin }) {
  const [cwid, setCwid] = useState("");
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);

  const handleLogin = () => {
    const student = STUDENTS_DB.find((s) => s.cwid === cwid.trim());
    if (!student) {
      setError("CWID not recognized. Check your ID and try again.");
      return;
    }
    setError("");
    onLogin(student);
  };

  return (
    <div style={styles.loginShell}>
      <div style={styles.loginBg} />
      <div style={styles.loginCard}>
        <div style={styles.loginHeader}>
          <div style={styles.loginLogoBox}>
            <span style={styles.loginLogo}>LT</span>
          </div>
          <h1 style={styles.loginTitle}>Help Desk Scheduler</h1>
          <p style={styles.loginSub}>Sign in with your CWID to manage shifts</p>
        </div>
        <div style={styles.loginForm}>
          <label style={styles.inputLabel}>Campus Wide ID</label>
          <div
            style={{
              ...styles.inputWrap,
              borderColor: error ? "#DC2626" : focused ? "#1E40AF" : "#CBD5E1",
              boxShadow: focused ? "0 0 0 3px rgba(30,64,175,0.1)" : "none",
            }}
          >
            <input
              style={styles.input}
              type="text"
              placeholder="e.g. 10398469"
              value={cwid}
              onChange={(e) => {
                setCwid(e.target.value.replace(/\D/g, ""));
                setError("");
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              maxLength={10}
            />
          </div>
          {error && <p style={styles.errorText}>{error}</p>}
          <button
            onClick={handleLogin}
            style={{
              ...styles.loginBtn,
              opacity: cwid.length < 5 ? 0.5 : 1,
            }}
            disabled={cwid.length < 5}
          >
            Sign In
          </button>
        </div>
        <div style={styles.loginFooter}>
          <p style={styles.loginFooterText}>
            Louisiana Tech University — IT Help Desk
          </p>
        </div>
      </div>
    </div>
  );
}

// --- SIGN UP VIEW ---
function SignUpView({ day, user, getSlotCount, isSignedUp, toggleSlot, getSlotStudents, autofillFromDay, showToast, schedule }) {
  const [expandedSlot, setExpandedSlot] = useState(null);
  const [autofillSource, setAutofillSource] = useState("");
  const [showAutofillConfirm, setShowAutofillConfirm] = useState(false);

  // Count user's shifts on each other day for the dropdown labels
  const getUserShiftCount = (d) => {
    if (!user) return 0;
    return Object.keys(schedule).filter(
      (k) => k.startsWith(`${d}|`) && k.endsWith(`|${user.cwid}`) && schedule[k]
    ).length;
  };

  const handleAutofill = () => {
    if (!autofillSource) return;
    const { added, skipped } = autofillFromDay(autofillSource, day);
    setShowAutofillConfirm(false);
    setAutofillSource("");
    if (added === 0 && skipped === 0) {
      showToast("No shifts to copy from " + autofillSource, "error");
    } else if (added > 0 && skipped > 0) {
      showToast(`Copied ${added} shift${added > 1 ? "s" : ""}, ${skipped} skipped (full)`);
    } else if (skipped > 0) {
      showToast(`All ${skipped} shift${skipped > 1 ? "s" : ""} skipped — slots full`, "error");
    } else {
      showToast(`Copied ${added} shift${added > 1 ? "s" : ""} from ${autofillSource}`);
    }
  };

  const otherDays = DAYS.filter((d) => d !== day);

  const myShifts = [];
  TEAMS.forEach((team) => {
    TIME_SLOTS.forEach((slot) => {
      if (isSignedUp(day, slot, team)) myShifts.push({ slot, team });
    });
  });

  return (
    <div style={styles.signupLayout}>
      {/* My shifts summary */}
      {myShifts.length > 0 && (
        <div style={styles.myShiftsBar}>
          <strong style={{ marginRight: 8 }}>Your {day} shifts:</strong>
          {myShifts.map((s, i) => (
            <span
              key={i}
              style={{
                ...styles.myShiftTag,
                background: TEAM_COLORS[s.team].tag,
              }}
            >
              {s.slot} · {s.team.replace("Support", "Sup.")}
            </span>
          ))}
        </div>
      )}

      {/* Autofill bar */}
      <div style={styles.autofillBar}>
        <div style={styles.autofillLeft}>
          <Icons.Copy />
          <span style={{ fontWeight: 600, fontSize: 13 }}>Copy shifts from:</span>
          <select
            value={autofillSource}
            onChange={(e) => {
              setAutofillSource(e.target.value);
              setShowAutofillConfirm(false);
            }}
            style={styles.autofillSelect}
          >
            <option value="">Select a day…</option>
            {otherDays.map((d) => {
              const count = getUserShiftCount(d);
              return (
                <option key={d} value={d} disabled={count === 0}>
                  {d} {count > 0 ? `(${count} shift${count > 1 ? "s" : ""})` : "(no shifts)"}
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
              Copy your {autofillSource} shifts to {day}? (Full slots will be skipped)
            </span>
            <button onClick={handleAutofill} style={styles.autofillConfirmBtn}>
              Confirm
            </button>
            <button
              onClick={() => setShowAutofillConfirm(false)}
              style={styles.autofillCancelBtn}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Grid */}
      <div style={styles.signupGrid}>
        {/* Header */}
        <div style={styles.gridHeader}>
          <div style={styles.gridTimeHeader}>Time</div>
          {TEAMS.map((team) => (
            <div
              key={team}
              style={{
                ...styles.gridTeamHeader,
                borderBottom: `3px solid ${TEAM_COLORS[team].border}`,
              }}
            >
              {team}
            </div>
          ))}
        </div>

        {/* Rows */}
        {TIME_SLOTS.map((slot) => {
          const isExpanded = expandedSlot === slot;
          return (
            <div key={slot}>
              <div
                style={{
                  ...styles.gridRow,
                  background: TIME_SLOTS.indexOf(slot) % 2 === 0 ? "#FAFAFA" : "#FFF",
                }}
              >
                <div
                  style={styles.gridTimeCell}
                  onClick={() => setExpandedSlot(isExpanded ? null : slot)}
                >
                  <span style={styles.timeText}>{slot}</span>
                  <span
                    style={{
                      ...styles.expandIcon,
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  >
                    <Icons.ChevronDown />
                  </span>
                </div>
                {TEAMS.map((team) => {
                  const count = getSlotCount(day, slot, team);
                  const full = count >= MAX_PER_TEAM;
                  const mine = isSignedUp(day, slot, team);
                  return (
                    <div key={team} style={styles.gridCell}>
                      <button
                        onClick={() => toggleSlot(day, slot, team)}
                        disabled={full && !mine}
                        style={{
                          ...styles.slotBtn,
                          background: mine
                            ? TEAM_COLORS[team].bg
                            : full
                            ? "#F1F5F9"
                            : "#FFF",
                          borderColor: mine
                            ? TEAM_COLORS[team].border
                            : full
                            ? "#E2E8F0"
                            : "#CBD5E1",
                          cursor: full && !mine ? "not-allowed" : "pointer",
                          opacity: full && !mine ? 0.6 : 1,
                        }}
                      >
                        {mine ? (
                          <span style={{ color: TEAM_COLORS[team].text, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                            <Icons.Check /> Signed Up
                          </span>
                        ) : full ? (
                          <span style={{ color: "#94A3B8", display: "flex", alignItems: "center", gap: 4 }}>
                            <Icons.Lock /> Full
                          </span>
                        ) : (
                          <span style={{ color: "#475569", display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={styles.capacityDots}>
                              {[0, 1, 2].map((i) => (
                                <span
                                  key={i}
                                  style={{
                                    ...styles.dot,
                                    background:
                                      i < count
                                        ? TEAM_COLORS[team].border
                                        : "#E2E8F0",
                                  }}
                                />
                              ))}
                            </span>
                            {count}/{MAX_PER_TEAM}
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div style={styles.expandedRow}>
                  {TEAMS.map((team) => {
                    const students = getSlotStudents(day, slot, team);
                    return (
                      <div key={team} style={styles.expandedTeam}>
                        <div
                          style={{
                            ...styles.expandedTeamLabel,
                            color: TEAM_COLORS[team].text,
                          }}
                        >
                          {team}
                        </div>
                        {students.length === 0 ? (
                          <span style={styles.emptySlot}>No one yet</span>
                        ) : (
                          students.map((name, i) => (
                            <div key={i} style={styles.studentName}>
                              <Icons.User /> {name}
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

// --- ADMIN / SCHEDULE VIEW ---
function AdminView({ day, getSlotStudents, getSlotCount }) {
  return (
    <div style={styles.adminWrap}>
      <div style={styles.adminGrid}>
        {/* Header */}
        <div style={styles.adminHeaderRow}>
          <div style={styles.adminTimeCol} />
          {TEAMS.map((team) => (
            <div
              key={team}
              style={{
                ...styles.adminTeamCol,
                background: TEAM_COLORS[team].bg,
                borderTop: `4px solid ${TEAM_COLORS[team].border}`,
              }}
            >
              {team}
            </div>
          ))}
        </div>

        {/* Rows */}
        {TIME_SLOTS.map((slot, si) => (
          <div
            key={slot}
            style={{
              ...styles.adminRow,
              background: si % 2 === 0 ? "#FAFAFA" : "#FFF",
            }}
          >
            <div style={styles.adminTimeCol}>
              <span style={styles.adminTime}>{slot}</span>
            </div>
            {TEAMS.map((team) => {
              const students = getSlotStudents(day, slot, team);
              const count = getSlotCount(day, slot, team);
              return (
                <div key={team} style={styles.adminTeamCell}>
                  {students.length > 0 ? (
                    <div style={styles.adminNames}>
                      {students.map((name, i) => (
                        <span
                          key={i}
                          style={{
                            ...styles.adminNameTag,
                            background: TEAM_COLORS[team].bg,
                            color: TEAM_COLORS[team].text,
                            borderLeft: `3px solid ${TEAM_COLORS[team].border}`,
                          }}
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={styles.adminEmpty}>—</span>
                  )}
                  <span
                    style={{
                      ...styles.adminCount,
                      color:
                        count >= MAX_PER_TEAM
                          ? "#16A34A"
                          : count > 0
                          ? "#D97706"
                          : "#CBD5E1",
                    }}
                  >
                    <Icons.Users /> {count}/{MAX_PER_TEAM}
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

// --- STYLES ---
const styles = {
  shell: {
    fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    minHeight: "100vh",
    background: "#F8FAFC",
    color: "#1E293B",
  },
  // Nav
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    height: 56,
    background: "#0F172A",
    color: "#FFF",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  navLeft: { display: "flex", alignItems: "baseline", gap: 10 },
  logo: {
    fontWeight: 800,
    fontSize: 17,
    letterSpacing: "0.08em",
    color: "#E11D48",
  },
  logoSub: { fontSize: 13, color: "#94A3B8", fontWeight: 500 },
  navTabs: { display: "flex", gap: 4 },
  navTab: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 14px",
    fontSize: 13,
    fontWeight: 600,
    border: "none",
    borderRadius: 6,
    background: "transparent",
    color: "#94A3B8",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  navTabActive: {
    background: "rgba(255,255,255,0.1)",
    color: "#FFF",
  },
  navRight: { display: "flex", alignItems: "center", gap: 8 },
  userBadge: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    fontWeight: 600,
    color: "#CBD5E1",
  },
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    padding: 6,
    border: "none",
    borderRadius: 6,
    background: "rgba(255,255,255,0.05)",
    color: "#64748B",
    cursor: "pointer",
  },
  // Day bar
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
  content: { padding: "16px 24px 40px" },

  // Login
  loginShell: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0F172A",
    fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  loginBg: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(ellipse at 30% 20%, rgba(225,29,72,0.15), transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(59,130,246,0.1), transparent 60%)",
  },
  loginCard: {
    position: "relative",
    width: 380,
    background: "#FFF",
    borderRadius: 16,
    boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
    overflow: "hidden",
  },
  loginHeader: {
    padding: "32px 32px 0",
    textAlign: "center",
  },
  loginLogoBox: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 52,
    height: 52,
    borderRadius: 14,
    background: "#0F172A",
    marginBottom: 16,
  },
  loginLogo: {
    color: "#E11D48",
    fontWeight: 800,
    fontSize: 20,
    letterSpacing: "0.05em",
  },
  loginTitle: {
    fontSize: 22,
    fontWeight: 800,
    color: "#0F172A",
    margin: "0 0 6px",
  },
  loginSub: { fontSize: 14, color: "#64748B", margin: 0 },
  loginForm: { padding: "24px 32px" },
  inputLabel: {
    display: "block",
    fontSize: 12,
    fontWeight: 700,
    color: "#475569",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  inputWrap: {
    border: "2px solid #CBD5E1",
    borderRadius: 10,
    overflow: "hidden",
    transition: "all 0.15s",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    fontSize: 16,
    border: "none",
    outline: "none",
    fontFamily: "'DM Mono', 'Courier New', monospace",
    letterSpacing: "0.1em",
    boxSizing: "border-box",
  },
  errorText: {
    fontSize: 13,
    color: "#DC2626",
    margin: "8px 0 0",
    fontWeight: 500,
  },
  loginBtn: {
    width: "100%",
    padding: "12px",
    marginTop: 16,
    fontSize: 14,
    fontWeight: 700,
    color: "#FFF",
    background: "#0F172A",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    transition: "opacity 0.15s",
  },
  loginFooter: {
    padding: "16px 32px",
    borderTop: "1px solid #F1F5F9",
    textAlign: "center",
  },
  loginFooterText: { fontSize: 12, color: "#94A3B8", margin: 0 },

  // Sign up
  signupLayout: { maxWidth: 960, margin: "0 auto" },
  myShiftsBar: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    padding: "12px 16px",
    background: "#FFF",
    borderRadius: 10,
    border: "1px solid #E2E8F0",
    marginBottom: 16,
    fontSize: 13,
    fontWeight: 500,
  },
  myShiftTag: {
    padding: "3px 10px",
    borderRadius: 6,
    color: "#FFF",
    fontSize: 12,
    fontWeight: 700,
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
  signupGrid: {
    background: "#FFF",
    borderRadius: 12,
    border: "1px solid #E2E8F0",
    overflow: "hidden",
  },
  gridHeader: {
    display: "grid",
    gridTemplateColumns: "130px 1fr 1fr 1fr",
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
  gridRow: {
    display: "grid",
    gridTemplateColumns: "130px 1fr 1fr 1fr",
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
  gridCell: { padding: "6px 8px", display: "flex", justifyContent: "center" },
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
  },
  capacityDots: { display: "flex", gap: 3 },
  dot: { width: 7, height: 7, borderRadius: "50%", transition: "background 0.15s" },

  // Expanded row
  expandedRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
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

  // Admin
  adminWrap: { maxWidth: 1100, margin: "0 auto", overflowX: "auto" },
  adminGrid: {
    background: "#FFF",
    borderRadius: 12,
    border: "1px solid #E2E8F0",
    overflow: "hidden",
    minWidth: 800,
  },
  adminHeaderRow: {
    display: "grid",
    gridTemplateColumns: "120px 1fr 1fr 1fr",
    borderBottom: "2px solid #E2E8F0",
  },
  adminTimeCol: {
    padding: "12px",
    display: "flex",
    alignItems: "center",
  },
  adminTeamCol: {
    padding: "14px 16px",
    fontSize: 13,
    fontWeight: 700,
    textAlign: "center",
    color: "#1E293B",
  },
  adminRow: {
    display: "grid",
    gridTemplateColumns: "120px 1fr 1fr 1fr",
    borderBottom: "1px solid #F1F5F9",
    minHeight: 52,
  },
  adminTime: { fontSize: 12, fontWeight: 700, color: "#475569" },
  adminTeamCell: {
    padding: "6px 10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderLeft: "1px solid #F1F5F9",
  },
  adminNames: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
    flex: 1,
  },
  adminNameTag: {
    padding: "3px 8px",
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 4,
  },
  adminEmpty: { color: "#CBD5E1", fontSize: 14 },
  adminCount: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
    fontWeight: 700,
    marginLeft: 8,
    whiteSpace: "nowrap",
  },

  // Toast
  toast: {
    position: "fixed",
    bottom: 24,
    left: "50%",
    transform: "translateX(-50%)",
    padding: "10px 20px",
    borderRadius: 8,
    color: "#FFF",
    fontSize: 13,
    fontWeight: 700,
    boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
    zIndex: 999,
    animation: "slideUp 0.3s ease",
  },
};
