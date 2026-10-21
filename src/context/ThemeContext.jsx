// src/context/ThemeContext.jsx — Robust dark/light theme with zero white flash
import { createContext, useContext, useLayoutEffect, useState } from "react";

const ThemeContext = createContext();
const THEME_COLORS = { dark: "#07090C", light: "#F5F8F7" };

function initialTheme() {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem("ep-theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(initialTheme);

  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("ep-theme", theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", THEME_COLORS[theme] || THEME_COLORS.dark);
  }, [theme]);

  const setThemeExplicit = (t) => setTheme(t === "light" ? "light" : "dark");
  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme: setThemeExplicit }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
