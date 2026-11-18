// src/components/AmbientBackground.jsx — app-wide animated mood backdrop.
// Renders a fixed, non-interactive layer of drifting colour blobs tinted by the
// current mood, plus a soft spotlight that follows the pointer ("live" feel).
// Animation is disabled automatically under reduced motion (see index.css).
import { useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext";

export default function AmbientBackground() {
  const { ambient } = useTheme();
  const ref = useRef(null);

  useEffect(() => {
    if (!ambient) return;
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const onMove = (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        el.style.setProperty("--mx", `${e.clientX}px`);
        el.style.setProperty("--my", `${e.clientY}px`);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ambient]);

  if (!ambient) return null;

  return (
    <div ref={ref} className="ambient-bg" aria-hidden="true">
      <span className="ambient-blob blob-1" />
      <span className="ambient-blob blob-2" />
      <span className="ambient-blob blob-3" />
      <span className="ambient-spot" />
    </div>
  );
}
