import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import * as api from "../api/client";

const styles = {
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
  loginHeader: { padding: "32px 32px 0", textAlign: "center" },
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
};

export default function LoginPage() {
  const [cwid, setCwid] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState(null);
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();

  const canSubmit = cwid.length >= 5 && pin.length >= 1 && !loading;

  const handleLogin = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      const data = await api.login(cwid.trim(), pin);
      loginUser(data.token, data.student);
    } catch (err) {
      if (err.status === 401) {
        const msg = err.message || "";
        if (msg.includes("PIN not set")) {
          setError("PIN not set. Contact an administrator.");
        } else if (msg.includes("Invalid PIN")) {
          setError("Invalid PIN. Please try again.");
        } else {
          setError("CWID not recognized. Check your ID and try again.");
        }
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.loginShell}>
      <div style={styles.loginBg} />
      <div className="login-card" style={styles.loginCard}>
        <div className="login-header" style={styles.loginHeader}>
          <div style={styles.loginLogoBox}>
            <span style={styles.loginLogo}>LT</span>
          </div>
          <h1 style={styles.loginTitle}>Help Desk Scheduler</h1>
          <p style={styles.loginSub}>Sign in with your CWID to manage shifts</p>
        </div>
        <div className="login-form" style={styles.loginForm}>
          <label style={styles.inputLabel}>Campus Wide ID</label>
          <div
            style={{
              ...styles.inputWrap,
              borderColor: error ? "#DC2626" : focusedField === "cwid" ? "#1E40AF" : "#CBD5E1",
              boxShadow: focusedField === "cwid" ? "0 0 0 3px rgba(30,64,175,0.1)" : "none",
            }}
          >
            <input
              style={styles.input}
              type="text"
              placeholder="e.g. 10384927"
              value={cwid}
              onChange={(e) => {
                setCwid(e.target.value.replace(/\D/g, ""));
                setError("");
              }}
              onFocus={() => setFocusedField("cwid")}
              onBlur={() => setFocusedField(null)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              maxLength={10}
            />
          </div>
          <label style={{ ...styles.inputLabel, marginTop: 16 }}>Campus PIN</label>
          <div
            style={{
              ...styles.inputWrap,
              borderColor: error ? "#DC2626" : focusedField === "pin" ? "#1E40AF" : "#CBD5E1",
              boxShadow: focusedField === "pin" ? "0 0 0 3px rgba(30,64,175,0.1)" : "none",
            }}
          >
            <input
              style={styles.input}
              type="password"
              placeholder="Enter your PIN"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError("");
              }}
              onFocus={() => setFocusedField("pin")}
              onBlur={() => setFocusedField(null)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>
          {error && <p style={styles.errorText}>{error}</p>}
          <button
            onClick={handleLogin}
            style={{
              ...styles.loginBtn,
              opacity: canSubmit ? 1 : 0.5,
            }}
            disabled={!canSubmit}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </div>
        <div className="login-footer" style={styles.loginFooter}>
          <p style={styles.loginFooterText}>
            Louisiana Tech University — IT Help Desk
          </p>
        </div>
      </div>
    </div>
  );
}
