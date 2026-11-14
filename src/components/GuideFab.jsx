// Draggable, position-editable Guide AI button. Lives on every in-app page
// (mounted once in the App shell). Drag to move; position persists per device.
// Long-press (600ms) toggles "edit mode" outline; double-click resets.
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import GuideAssistant from "./GuideAssistant";
import { Sparkles, X, Move } from "lucide-react";

const POS_KEY = "exampadi_guide_fab_pos";
const HIDDEN_ON = ["/", "/auth"];

function loadPos() {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (typeof p.x === "number" && typeof p.y === "number") return p;
    }
  } catch { /* no saved position */ }
  return null;
}

export default function GuideFab() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(loadPos);
  const [editMode, setEditMode] = useState(false);
  const drag = useRef(null);
  const pressTimer = useRef(null);

  // Default: bottom-right, above the mobile nav
  const fallback = { x: Math.max(16, window.innerWidth - 76), y: Math.max(16, window.innerHeight - 160) };
  const p = pos || fallback;

  useEffect(() => {
    const onResize = () => {
      setPos((prev) => {
        if (!prev) return prev;
        return {
          x: Math.min(prev.x, window.innerWidth - 76),
          y: Math.min(prev.y, window.innerHeight - 76),
        };
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (HIDDEN_ON.includes(location.pathname)) return null;

  function save(nx, ny) {
    const clamped = {
      x: Math.min(Math.max(8, nx), window.innerWidth - 68),
      y: Math.min(Math.max(8, ny), window.innerHeight - 68),
    };
    setPos(clamped);
    try { localStorage.setItem(POS_KEY, JSON.stringify(clamped)); } catch { /* private mode */ }
  }

  function onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const orig = { ...(pos || fallback) };
    let moved = false;
    drag.current = { startX, startY, orig, moved: false };

    pressTimer.current = setTimeout(() => {
      if (drag.current && !drag.current.moved) {
        setEditMode((v) => !v);
        drag.current = null;
      }
    }, 600);

    function onMove(ev) {
      if (!drag.current) return;
      const dx = ev.clientX - drag.current.startX;
      const dy = ev.clientY - drag.current.startY;
      if (Math.abs(dx) + Math.abs(dy) > 8) {
        moved = true;
        drag.current.moved = true;
        clearTimeout(pressTimer.current);
        save(drag.current.orig.x + dx, drag.current.orig.y + dy);
      }
    }
    function onUp() {
      clearTimeout(pressTimer.current);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const wasDrag = drag.current?.moved;
      drag.current = null;
      if (!wasDrag && !moved) setOpen((o) => !o);
    }
    void moved;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function resetPos() {
    try { localStorage.removeItem(POS_KEY); } catch { /* nothing stored */ }
    setPos(null);
    setEditMode(false);
  }

  return (
    <>
      <div
        onPointerDown={onPointerDown}
        onDoubleClick={resetPos}
        title="Guide AI — tap to open, drag to move, long-press for edit mode, double-click to reset"
        style={{
          position: "fixed", left: p.x, top: p.y, zIndex: 65,
          width: 60, height: 60, borderRadius: "50%", cursor: "grab",
          background: "var(--landing-gradient)", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: editMode
            ? "0 0 0 3px var(--accent), 0 8px 32px rgb(var(--primary-rgb) / 0.5)"
            : "0 8px 28px rgb(var(--primary-rgb) / 0.45)",
          border: editMode ? "2px dashed #fff" : "1px solid rgba(255,255,255,0.25)",
          touchAction: "none", userSelect: "none",
          animation: editMode ? "none" : "fabFloat 3.2s ease-in-out infinite",
        }}
      >
        {open ? <X size={24} /> : editMode ? <Move size={22} /> : <Sparkles size={24} />}
      </div>
      <style>{`
        @keyframes fabFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
        @media (prefers-reduced-motion: reduce) { div[title^="Guide AI"] { animation: none !important; } }
      `}</style>

      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 12 }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }} />
          <div className="glass-card" style={{ position: "relative", width: "100%", maxWidth: 560, maxHeight: "82vh", overflowY: "auto", padding: 20 }}>
            <button
              onClick={() => setOpen(false)}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 6,
              }}
              title="Close"
            >
              <X size={20} />
            </button>
            <GuideAssistant compact onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
