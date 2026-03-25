import { useAuth } from "../context/AuthContext";
import { Icons } from "./Icons";

const styles = {
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
};

export default function Nav({ view, onViewChange }) {
  const { user, isAdmin, logout } = useAuth();

  const tabs = [
    { id: "signup", label: "Sign Up", icon: <Icons.Calendar /> },
    { id: "schedule", label: "Schedule", icon: <Icons.Grid /> },
    { id: "today", label: "Today", icon: <Icons.Clock /> },
    { id: "timeoff", label: "Time Off", icon: <Icons.Calendar /> },
    { id: "timeclock", label: "Time Errors", icon: <Icons.Clock /> },
  ];

  if (isAdmin) {
    tabs.push({ id: "admin", label: "Admin Panel", icon: <Icons.Settings /> });
  }

  return (
    <nav className="nav-bar" style={styles.nav}>
      <div style={styles.navLeft}>
        <span style={styles.logo}>LA TECH</span>
        <span style={styles.logoSub}>IT Help Desk</span>
      </div>
      <div className="nav-tabs" style={styles.navTabs}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className="nav-tab"
            onClick={() => onViewChange(tab.id)}
            style={{
              ...styles.navTab,
              ...(view === tab.id ? styles.navTabActive : {}),
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>
      <div className="nav-right" style={styles.navRight}>
        <div style={styles.userBadge}>
          <Icons.User />
          <span>{user?.name?.split(" ")[0]}</span>
        </div>
        <button onClick={logout} style={styles.logoutBtn}>
          <Icons.LogOut />
        </button>
      </div>
    </nav>
  );
}
