// Movable, collapsible text scratchpad for rough work during exams.
// Floating draggable panel — never covers the whole screen, can be minimized
// to a pill, moved anywhere, and remembers its position per device.
import { useState, useRef, useEffect, useCallback } from "react";
import { X, Minus, Calculator, Delete, GripHorizontal } from "lucide-react";

const POS_KEY = "exampadi_scratchpad_pos";

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

export default function Scratchpad({ open, onClose, context = "" }) {
  const [text, setText] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const [calcInput, setCalcInput] = useState("");
  const [calcResult, setCalcResult] = useState("");
  const [pos, setPos] = useState(loadPos);
  const [dragging, setDragging] = useState(false);
  const textareaRef = useRef(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const storageKey = `ep_scratchpad_${context?.slice(0, 50) || "default"}`;

  // Default position: bottom-right, above the mobile nav
  const fallback = {
    x: Math.max(12, window.innerWidth - 356),
    y: Math.max(12, window.innerHeight - 480),
  };
  const p = pos || fallback;

  useEffect(() => {
    if (!open) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setText(saved);
    } catch { /* ignore */ }
  }, [open, storageKey]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      try { localStorage.setItem(storageKey, text); } catch { /* ignore */ }
    }, 350);
    return () => clearTimeout(timer);
  }, [text, open, storageKey]);

  useEffect(() => {
    if (open && !isMinimized && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [open, isMinimized]);

  // Keep panel inside viewport on resize
  useEffect(() => {
    const onResize = () => {
      setPos((prev) => {
        if (!prev) return prev;
        return {
          x: Math.min(prev.x, window.innerWidth - 80),
          y: Math.min(prev.y, window.innerHeight - 80),
        };
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const save = useCallback((nx, ny) => {
    const clamped = {
      x: Math.min(Math.max(8, nx), window.innerWidth - 80),
      y: Math.min(Math.max(8, ny), window.innerHeight - 80),
    };
    setPos(clamped);
    try { localStorage.setItem(POS_KEY, JSON.stringify(clamped)); } catch { /* private mode */ }
  }, []);

  function onDragStart(e) {
    if (e.button !== undefined && e.button !== 0) return;
    const touch = e.touches ? e.touches[0] : e;
    dragOffset.current = {
      x: touch.clientX - p.x,
      y: touch.clientY - p.y,
    };
    setDragging(true);

    function onMove(ev) {
      const t = ev.touches ? ev.touches[0] : ev;
      save(t.clientX - dragOffset.current.x, t.clientY - dragOffset.current.y);
    }
    function onUp() {
      setDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onUp);
  }

  function handleCalcInput(value) {
    if (value === "C") {
      setCalcInput("");
      setCalcResult("");
    } else if (value === "=") {
      try {
        const sanitized = calcInput.replace(/×/g, "*").replace(/÷/g, "/");
        const result = Function(`"use strict"; return (${sanitized})`)();
        setCalcResult(String(result));
        setCalcInput(String(result));
      } catch {
        setCalcResult("Error");
      }
    } else if (value === "⌫") {
      setCalcInput((prev) => prev.slice(0, -1));
    } else {
      setCalcInput((prev) => prev + value);
    }
  }

  if (!open) return null;

  // Minimized pill — small draggable circle
  if (isMinimized) {
    return (
      <div
        onMouseDown={onDragStart}
        onTouchStart={onDragStart}
        onDoubleClick={() => setIsMinimized(false)}
        title="Scratchpad — double-click to open, drag to move"
        style={{
          position: "fixed",
          left: p.x,
          top: p.y,
          zIndex: 9999,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "var(--primary)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "grab",
          boxShadow: "0 6px 24px rgb(var(--primary-rgb) / 0.5)",
          touchAction: "none",
          userSelect: "none",
        }}
      >
        <Calculator size={22} />
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        left: p.x,
        top: p.y,
        zIndex: 9999,
        width: 340,
        maxHeight: "70vh",
        background: "var(--bg-2)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 14,
        boxShadow: "0 12px 48px rgba(0,0,0,0.5)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        backdropFilter: "blur(12px)",
        transition: dragging ? "none" : "box-shadow 0.2s",
      }}
    >
      {/* Draggable header */}
      <div
        onMouseDown={onDragStart}
        onTouchStart={onDragStart}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px",
          background: "rgb(var(--primary-rgb) / 0.15)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          cursor: "grab",
          userSelect: "none",
          touchAction: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <GripHorizontal size={14} style={{ color: "var(--text-muted)" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Scratchpad</span>
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>· rough work + calc</span>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          <button
            onClick={() => setIsMinimized(true)}
            title="Minimize to pill"
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
              borderRadius: 6,
            }}
          >
            <Minus size={15} />
          </button>
          <button
            onClick={onClose}
            title="Close"
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
              borderRadius: 6,
            }}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Text area */}
      <div style={{ padding: 10, display: "flex", flexDirection: "column", minHeight: 120 }}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type rough work here — formulas, steps, notes…"
          style={{
            width: "100%",
            minHeight: 110,
            maxHeight: 220,
            padding: 10,
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--bg)",
            color: "var(--text)",
            fontSize: 13,
            fontFamily: "'JetBrains Mono', monospace",
            resize: "vertical",
            outline: "none",
            lineHeight: 1.55,
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Calculator */}
      <div style={{ padding: "0 10px 10px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 6,
          }}
        >
          <Calculator size={13} style={{ color: "var(--primary)" }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>Quick Calculator</span>
        </div>
        <div
          style={{
            padding: "8px 10px",
            borderRadius: 8,
            background: "rgba(0,0,0,0.3)",
            border: "1px solid var(--border)",
            marginBottom: 6,
            minHeight: 34,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 8,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 15,
            color: "var(--text)",
            wordBreak: "break-all",
          }}
        >
          <span>{calcInput || "0"}</span>
          {calcResult && <span style={{ color: "var(--primary)", fontWeight: 700 }}>= {calcResult}</span>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
          {["C", "⌫", "÷", "×", "7", "8", "9", "-", "4", "5", "6", "+", "1", "2", "3", "=", "0", ".", "(", ")"].map((btn) => (
            <button
              key={btn}
              onClick={() => handleCalcInput(btn)}
              style={{
                padding: "8px 0",
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.06)",
                background: btn === "=" ? "var(--primary)" : "rgba(255,255,255,0.05)",
                color: btn === "=" ? "#fff" : "var(--text)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {btn}
            </button>
          ))}
        </div>
        {calcResult && (
          <button
            onClick={() => {
              setCalcResult("");
              setCalcInput("");
            }}
            style={{
              width: "100%",
              marginTop: 6,
              padding: 6,
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--bg)",
              color: "var(--text-muted)",
              fontSize: 11,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <Delete size={11} /> Clear
          </button>
        )}
      </div>
    </div>
  );
}