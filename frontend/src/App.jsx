import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import Nav from "./components/Nav";
import DaySelector from "./components/DaySelector";
import Toast, { useToast } from "./components/Toast";
import SignUpPage from "./pages/SignUpPage";
import SchedulePage from "./pages/SchedulePage";
import TodayPage from "./pages/TodayPage";
import TimeOffPage from "./pages/TimeOffPage";
import TimeclockPage from "./pages/TimeclockPage";
import AdminPage from "./pages/AdminPage";
import { getCurrentDay } from "./styles/theme";

function AppShell() {
  const { user, loading } = useAuth();
  const [view, setView] = useState("signup");
  const [selectedDay, setSelectedDay] = useState(getCurrentDay);
  const { toast, showToast } = useToast();

  if (loading) return null;
  if (!user) return <LoginPage />;

  const needsDaySelector = view === "signup" || view === "schedule";

  return (
    <div style={{
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
      minHeight: "100vh",
      background: "#F8FAFC",
      color: "#1E293B",
    }}>
      <Nav view={view} onViewChange={setView} />
      {needsDaySelector && (
        <DaySelector selectedDay={selectedDay} onSelect={setSelectedDay} />
      )}
      <div className="app-content" style={{ padding: "16px 24px 40px" }}>
        {view === "signup" && (
          <SignUpPage day={selectedDay} showToast={showToast} />
        )}
        {view === "schedule" && (
          <SchedulePage day={selectedDay} />
        )}
        {view === "today" && (
          <TodayPage />
        )}
        {view === "timeoff" && (
          <TimeOffPage showToast={showToast} />
        )}
        {view === "timeclock" && (
          <TimeclockPage showToast={showToast} />
        )}
        {view === "admin" && (
          <AdminPage showToast={showToast} />
        )}
      </div>
      <Toast toast={toast} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
