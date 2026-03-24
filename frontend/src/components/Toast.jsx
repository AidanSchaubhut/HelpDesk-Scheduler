import { useState, useCallback, useRef } from "react";

export function useToast() {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback((msg, type = "success") => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ msg, type });
    timerRef.current = setTimeout(() => setToast(null), 2400);
  }, []);

  return { toast, showToast };
}

export default function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div
      style={{
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
        background: toast.type === "error" ? "#DC2626" : "#16A34A",
      }}
    >
      {toast.type === "error" ? "\u2715" : "\u2713"} {toast.msg}
    </div>
  );
}
