// Collapsible text-based scratchpad for rough work during exams.
// Slides from right, non-intrusive, can be minimized.
import { useState, useRef, useEffect } from "react";
import { X, Minus, Plus, Calculator, Delete } from "lucide-react";

export default function Scratchpad({ open, onClose, context = "" }) {
  const [text, setText] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const [calcInput, setCalcInput] = useState("");
  const [calcResult, setCalcResult] = useState("");
  const textareaRef = useRef(null);
  const storageKey = `ep_scratchpad_${context?.slice(0, 50) || "default"}`;

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

  function handleCalcInput(value) {
    if (value === "C") {
      setCalcInput("");
      setCalcResult("");
    } else if (value === "=") {
      try {
        // Safe calculation without eval
        const sanitized = calcInput.replace(/×/g, "*").replace(/÷/g, "/");
        const result = Function(`"use strict"; return (${sanitized})`)();
        setCalcResult(String(result));
        setCalcInput(String(result));
      } catch {
        setCalcResult("Error");
      }
    } else if (value === "⌫") {
      setCalcInput(prev => prev.slice(0, -1));
    } else {
      setCalcInput(prev => prev + value);
    }
  }

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        right: isMinimized ? 16 : 0,
        top: isMinimized ? 16 : 0,
        bottom: isMinimized ? "auto" : 0,
        width: isMinimized ? 48 : 380,
        height: isMinimized ? 48 : "100vh",
        background: "var(--bg-2)",
        borderLeft: isMinimized ? "none" : "1px solid var(--border)",
        borderRadius: isMinimized ? 12 : 0,
        boxShadow: isMinimized ? "0 4px 20px rgba(0,0,0,0.3)" : "none",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        transition: "all 0.3s ease",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: "var(--bg-3)",
          borderBottom: isMinimized ? "none" : "1px solid var(--border)",
          cursor: isMinimized ? "pointer" : "default",
        }}
        onClick={() => isMinimized && setIsMinimized(false)}
      >
        {!isMinimized && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Scratchpad</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>(Text & Calc)</span>
          </div>
        )}
        <div style={{ display: "flex", gap: 4 }}>
          {!isMinimized && (
            <button
              onClick={() => setIsMinimized(true)}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: 4,
                display: "flex",
                alignItems: "center",
              }}
              title="Minimize"
            >
              <Minus size={16} />
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
            }}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Text Area */}
          <div style={{ flex: 1, padding: 12, display: "flex", flexDirection: "column" }}>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your rough work here... Use this space for calculations, notes, or working out problems."
              style={{
                flex: 1,
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--text)",
                fontSize: 14,
                fontFamily: "'JetBrains Mono', monospace",
                resize: "none",
                outline: "none",
                lineHeight: 1.6,
              }}
            />
          </div>

          {/* Calculator */}
          <div style={{ padding: 12, borderTop: "1px solid var(--border)", background: "var(--bg-3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Calculator size={16} style={{ color: "var(--primary)" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>Quick Calculator</span>
            </div>
            <div
              style={{
                padding: 8,
                borderRadius: 6,
                background: "var(--bg)",
                border: "1px solid var(--border)",
                marginBottom: 8,
                minHeight: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 16,
                color: "var(--text)",
                wordBreak: "break-all",
              }}
            >
              {calcInput || "0"}
              {calcResult && <span style={{ marginLeft: 8, color: "var(--primary)" }}>= {calcResult}</span>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
              {["C", "⌫", "÷", "×", "7", "8", "9", "-", "4", "5", "6", "+", "1", "2", "3", "=", "0", ".", "(", ")"].map((btn) => (
                <button
                  key={btn}
                  onClick={() => handleCalcInput(btn)}
                  style={{
                    padding: "8px 4px",
                    borderRadius: 6,
                    border: "1px solid var(--border)",
                    background: btn === "=" ? "var(--primary)" : "var(--bg)",
                    color: btn === "=" ? "#fff" : "var(--text)",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = btn === "=" ? "var(--primary)" : "var(--bg-2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = btn === "=" ? "var(--primary)" : "var(--bg)";
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
                  marginTop: 8,
                  padding: 6,
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  color: "var(--text-muted)",
                  fontSize: 12,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                }}
              >
                <Delete size={12} /> Clear
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}