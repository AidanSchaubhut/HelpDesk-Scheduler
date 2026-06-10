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

// Parse a slot string into 24h start minutes from midnight.
// Two formats are accepted so we don't have to migrate stored schedule rows:
//   Legacy 12h ("8:00", "1:00", "12:30") — used for slots starting 8 AM - 7:30 PM.
//     Rule: hours 1-7 → PM (+12). Matches the original 8 AM - 5 PM schedule.
//   24h zero-padded ("07:00", "20:00") — used for slots before 8 AM or at/after 8 PM,
//     where the legacy rule would be ambiguous.
export function slotToMinutes(slot) {
  const startStr = slot.split(" - ")[0];
  const [hStr, mStr] = startStr.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  // 24h format: zero-padded ("07") or hours 13-23.
  if ((hStr.length === 2 && hStr[0] === "0") || h >= 13) {
    return h * 60 + m;
  }
  // Legacy 12h: hours 1-7 are PM.
  const h24 = h >= 1 && h <= 7 ? h + 12 : h;
  return h24 * 60 + m;
}

// Convert 24h minutes from midnight to a slot time string.
// Uses 24h zero-padded format ("07:00", "20:30") to disambiguate; otherwise 12h ("8:00", "1:00").
function minutesToSlotTime(minutes, use24h) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (use24h) {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  }
  const h12 = h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, "0")}`;
}

// Generate slot strings between startMinutes and endMinutes (24h minutes from midnight).
// Slots whose start hour falls inside 8 AM - 7:30 PM keep the legacy 12h format so they
// match existing DB keys. Slots outside that window use 24h zero-padded format.
export function generateSlots(startMinutes, endMinutes) {
  const slots = [];
  for (let m = startMinutes; m < endMinutes; m += 30) {
    const startH = Math.floor(m / 60);
    const use24h = startH < 8 || startH >= 20;
    slots.push(`${minutesToSlotTime(m, use24h)} - ${minutesToSlotTime(m + 30, use24h)}`);
  }
  return slots;
}

// Parse "HH:MM" (24h) to minutes from midnight
export function timeToMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Default team hours: 8:00 AM - 5:00 PM (480 - 1020 minutes)
const DEFAULT_START = 480;
const DEFAULT_END = 1020;

// Build a lookup map from teamHours array: { teamId: { day: { start, end } } }
export function buildTeamHoursMap(teamHoursArray) {
  const map = {};
  for (const entry of teamHoursArray) {
    if (!map[entry.team_id]) map[entry.team_id] = {};
    map[entry.team_id][entry.day] = {
      start: timeToMinutes(entry.start_time),
      end: timeToMinutes(entry.end_time),
    };
  }
  return map;
}

// Get the start/end minutes for a team on a day, with defaults
export function getTeamRange(teamHoursMap, teamId, day) {
  const entry = teamHoursMap[teamId]?.[day];
  return { start: entry?.start ?? DEFAULT_START, end: entry?.end ?? DEFAULT_END };
}

// Compute visible slots for a day: union of all teams' hours ranges
export function getVisibleSlots(teamHoursMap, teams, day) {
  let earliest = DEFAULT_START;
  let latest = DEFAULT_END;
  for (const team of teams) {
    const range = getTeamRange(teamHoursMap, team.id, day);
    if (range.start < earliest) earliest = range.start;
    if (range.end > latest) latest = range.end;
  }
  return generateSlots(earliest, latest);
}

// Check if a slot falls within a team's operating hours for a day
export function isSlotActiveForTeam(slot, teamId, day, teamHoursMap) {
  const slotStart = slotToMinutes(slot);
  const range = getTeamRange(teamHoursMap, teamId, day);
  return slotStart >= range.start && slotStart < range.end;
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
