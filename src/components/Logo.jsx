// ExamPadi Logo — "The Intelligent E" with Brain + AI Analysis
// Uses theme-aware SVG: logo-dark.svg for dark mode, logo-light.svg for light mode
import { useTheme } from "../context/ThemeContext";
import { useEffect, useState } from "react";

export default function Logo({ size = 36, radius = 10 }) {
  const { theme } = useTheme();
  const [logoSvg, setLogoSvg] = useState("");
  const [logoLoaded, setLogoLoaded] = useState(false);

  useEffect(() => {
    const logoFile = theme === "light" ? "/logo-light.svg" : "/logo-dark.svg";
    
    // Fetch and inline the SVG for styling control
    fetch(logoFile)
      .then(res => res.text())
      .then(svgText => {
        setLogoSvg(svgText);
        setLogoLoaded(true);
      })
      .catch(() => {
        // Fallback to default logo
        setLogoLoaded(true);
      });
  }, [theme]);

  // Fallback static logo (original E-book mark)
  const fallbackLogo = (
    <svg viewBox="0 0 512 512" width={size * 0.82} height={size * 0.82}>
      <defs>
        <linearGradient id="ep-logo-neon" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6AF7C6" />
          <stop offset="0.55" stopColor="#2EE6A8" />
          <stop offset="1" stopColor="#0EA5A5" />
        </linearGradient>
        <linearGradient id="ep-logo-gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFE9A8" />
          <stop offset="1" stopColor="#F5C451" />
        </linearGradient>
      </defs>
      <path d="M256 84 72 170l184 86 184-86z" fill="url(#ep-logo-neon)" />
      <path d="M256 232 136 176v88c0 52 54 92 120 112 66-20 120-60 120-112v-88z" fill="none" stroke="url(#ep-logo-neon)" strokeWidth="22" strokeLinejoin="round" />
      <path d="M408 74l11 30 30 11-30 11-11 30-11-30-30-11 30-11z" fill="url(#ep-logo-gold)" />
    </svg>
  );

  if (!logoLoaded) {
    return (
      <span
        style={{
          width: size, height: size, borderRadius: radius, flexShrink: 0,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          background: "var(--bg-2)",
          border: "1px solid var(--border)",
        }}
      >
        {fallbackLogo}
      </span>
    );
  }

  return (
    <span
      style={{
        width: size, height: size, borderRadius: radius, flexShrink: 0,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: "var(--bg-2)",
        border: "1px solid var(--border)",
      }}
      dangerouslySetInnerHTML={{ __html: logoSvg }}
    />
  );
}