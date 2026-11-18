// src/lib/mood.js — time-of-day "mood" palette layered over the light/dark theme.
// The mood only recolours background tints + ambient glow colours (never text or
// borders), so contrast is preserved in both themes.

export const MOOD_KEY = "ep-mood-mode";   // "auto" | "off" | a mood id
export const AMBIENT_KEY = "ep-ambient";  // "on" | "off"

export const MOODS = {
  morning: { id: "morning", label: "Morning", emoji: "🌅" },
  day: { id: "day", label: "Day", emoji: "☀️" },
  evening: { id: "evening", label: "Evening", emoji: "🌆" },
  night: { id: "night", label: "Night", emoji: "🌙" },
};

export const MOOD_ORDER = ["morning", "day", "evening", "night"];

// 5–11 morning · 11–17 day · 17–20 evening · else night
export function moodForHour(hour) {
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "evening";
  return "night";
}

export function currentMood() {
  return moodForHour(new Date().getHours());
}

export function isValidMoodMode(mode) {
  return mode === "auto" || mode === "off" || Object.prototype.hasOwnProperty.call(MOODS, mode);
}
