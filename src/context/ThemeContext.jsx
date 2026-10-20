// src/context/ThemeContext.jsx — Robust dark/light theme with zero white flash
import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ep-theme") || "dark";
    }
    return "dark";
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("ep-theme");
    const preferred = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    const initial = stored || preferred;
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("ep-theme", theme);
  }, [theme, mounted]);

  const setThemeExplicit = (t) => setTheme(t);
  const toggle = () => setTheme(t => t === "dark" ? "light" : "dark");

  // Prevent flash of unmounted content
  if (!mounted) {
    return (
      <ThemeContext.Provider value={{ theme: "dark", toggle: () => {}, setTheme: () => {} }}>
        <div style={{ visibility: "hidden" }}>{children}</div>
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme: setThemeExplicit }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
