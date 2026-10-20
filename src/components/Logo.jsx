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
          <stop offset="0" stopColor="#4E7A4E" />
          <stop offset="0.55" stopColor="#6A9A6A" />
          <stop offset="1" stopColor="#8FCE8F" />
        </linearGradient>
        <linearGradient id="ep-logo-gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFE9A8" />
          <stop offset="1" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      <rect x="118" y="118" width="44" height="212" rx="22" fill="#4E7A4E" />
      <rect x="118" y="118" width="190" height="44" rx="22" fill="url(#ep-logo-neon)" />
      <rect x="118" y="214" width="226" height="44" rx="22" fill="url(#ep-logo-gold)" />
      <rect x="118" y="310" width="150" height="20" rx="10" fill="#6A9A6A" />
      <circle cx="398" cy="132" r="36" fill="#07120C" stroke="url(#ep-logo-gold)" strokeWidth="12" />
      <circle cx="398" cy="132" r="12" fill="url(#ep-logo-gold)" />
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