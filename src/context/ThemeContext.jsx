// src/context/ThemeContext.jsx — Robust dark/light theme + time-of-day "mood"
// with zero white flash.
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useLayoutEffect, useState, useEffect } from "react";
import { MOOD_KEY, AMBIENT_KEY, MOODS, isValidMoodMode, currentMood } from "../lib/mood";

const ThemeContext = createContext();
const THEME_COLORS = { dark: "#07090C", light: "#F5F8F7" };
const MOOD_TICK_MS = 60_000;

function initialTheme() {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem("ep-theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function initialMoodMode() {
  if (typeof window === "undefined") return "auto";
  const v = localStorage.getItem(MOOD_KEY);
  return isValidMoodMode(v) ? v : "auto";
}

function initialAmbient() {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(AMBIENT_KEY) !== "off";
}

// Resolve a mode to a concrete mood id (or null when disabled).
function resolveMood(mode) {
  if (mode === "off") return null;
  if (mode === "auto") return currentMood();
  return MOODS[mode] ? mode : null;
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(initialTheme);
  const [moodMode, setMoodMode] = useState(initialMoodMode);
  const [mood, setMood] = useState(() => resolveMood(initialMoodMode()));
  const [ambient, setAmbientState] = useState(initialAmbient);

  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("ep-theme", theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", THEME_COLORS[theme] || THEME_COLORS.dark);
  }, [theme]);

  // Apply the resolved mood attribute + persist the chosen mode.
  useLayoutEffect(() => {
    if (mood) document.documentElement.setAttribute("data-mood", mood);
    else document.documentElement.removeAttribute("data-mood");
    localStorage.setItem(MOOD_KEY, moodMode);
  }, [mood, moodMode]);

  // Persist the animated-background preference.
  useLayoutEffect(() => {
    localStorage.setItem(AMBIENT_KEY, ambient ? "on" : "off");
  }, [ambient]);

  // Auto mode: re-check periodically so the mood shifts with the time of day.
  useEffect(() => {
    if (moodMode !== "auto") return;
    const tick = () => setMood((prev) => {
      const next = currentMood();
      return prev === next ? prev : next;
    });
    const id = setInterval(tick, MOOD_TICK_MS);
    const onVis = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [moodMode]);

  const setThemeExplicit = (t) => setTheme(t === "light" ? "light" : "dark");
  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const setMoodModeSafe = (m) => {
    const next = isValidMoodMode(m) ? m : "auto";
    setMoodMode(next);
    setMood(resolveMood(next));
  };
  const setAmbient = (v) => setAmbientState(!!v);

  return (
    <ThemeContext.Provider value={{
      theme, toggle, setTheme: setThemeExplicit,
      mood, moodMode, setMoodMode: setMoodModeSafe,
      ambient, setAmbient,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
