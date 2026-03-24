// Matches the styling_example_helpdesk-scheduler.jsx design language
export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export const TIME_SLOTS = [];
for (let h = 8; h < 17; h++) {
  for (let m = 0; m < 60; m += 30) {
    if (h === 16 && m === 30) {
      TIME_SLOTS.push("4:30 - 5:00");
      continue;
    }
    const startH = h > 12 ? h - 12 : h;
    const endMin = m === 30 ? "00" : "30";
    const endH = m === 30 ? (h + 1 > 12 ? h + 1 - 12 : h + 1) : h > 12 ? h - 12 : h;
    TIME_SLOTS.push(`${startH}:${m === 0 ? "00" : "30"} - ${endH}:${endMin}`);
  }
}

// Returns the current day name, or "Monday" if it's a weekend
export function getCurrentDay() {
  const dayIndex = new Date().getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  if (dayIndex === 0 || dayIndex === 6) return "Monday";
  return DAYS[dayIndex - 1];
}

// Parse a slot string like "8:00 - 8:30" into 24h start minutes from midnight
// e.g. "8:00 - 8:30" → 480, "1:00 - 1:30" → 780 (1 PM)
export function slotToMinutes(slot) {
  const startStr = slot.split(" - ")[0]; // e.g. "8:00" or "1:00"
  let [h, m] = startStr.split(":").map(Number);
  // Slots run 8 AM to 5 PM. Hours 1-5 are PM (13-17).
  if (h < 8) h += 12;
  return h * 60 + m;
}

// Default color palette for teams that don't have a custom color stored
const DEFAULT_PALETTE = [
  { bg: "#DBEAFE", border: "#3B82F6", text: "#1E40AF", tag: "#2563EB" },
  { bg: "#FCE4EC", border: "#E91E63", text: "#880E4F", tag: "#D81B60" },
  { bg: "#FFF9C4", border: "#F9A825", text: "#795548", tag: "#F57F17" },
  { bg: "#E8F5E9", border: "#4CAF50", text: "#1B5E20", tag: "#2E7D32" },
  { bg: "#F3E5F5", border: "#9C27B0", text: "#4A148C", tag: "#7B1FA2" },
  { bg: "#FFF3E0", border: "#FF9800", text: "#E65100", tag: "#EF6C00" },
  { bg: "#E0F7FA", border: "#00BCD4", text: "#006064", tag: "#00838F" },
];

// Parse hex color and generate matching palette entry
export function teamColors(hexColor, index = 0) {
  if (!hexColor) return DEFAULT_PALETTE[index % DEFAULT_PALETTE.length];

  // Try to generate a palette from the stored color
  try {
    const hex = hexColor.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return {
      bg: `rgba(${r}, ${g}, ${b}, 0.12)`,
      border: hexColor,
      text: `rgb(${Math.max(0, r - 60)}, ${Math.max(0, g - 60)}, ${Math.max(0, b - 60)})`,
      tag: hexColor,
    };
  } catch {
    return DEFAULT_PALETTE[index % DEFAULT_PALETTE.length];
  }
}
