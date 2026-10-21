/* eslint-disable react-refresh/only-export-components */
// src/components/Whiteboard.jsx
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Calculator,
  Eraser,
  Pen,
  Trash2,
  X,
  Minimize2,
  Maximize2,
  Sparkles,
} from "lucide-react";
import WhiteboardAI from "./WhiteboardAI";

const COLORS = ["#000000", "#E53E3E", "#3182CE", "#38A169"];
const COLOR_NAMES = ["Black", "Red", "Blue", "Green"];
const PEN_SIZES = { thin: 2, medium: 4, thick: 8 };

const useWhiteboard = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiImage, setAiImage] = useState(null);
  const canvasRef = useRef(null);

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const exportCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL("image/png");
  }, []);

  const [calcDisplay, setCalcDisplay] = useState({
    input: "0",
    result: "",
    history: "",
  });

  const calcState = useRef({ input: "0", result: "", history: "" });

  const calcInput = useCallback((value) => {
    const c = calcState.current;
    if (value === "clear") {
      c.input = "0";
      c.result = "";
      c.history = "";
    } else if (value === "backspace") {
      c.input = c.input.length > 1 ? c.input.slice(0, -1) : "0";
    } else if (value === "=") {
      try {
        const expr = c.input.replace(/×/g, "*").replace(/÷/g, "/");
        const res = Function(`"use strict"; return (${expr})`)();
        c.history = `${c.input} =`;
        c.result = Number.isFinite(res) ? String(res) : "Error";
        c.input = c.result;
      } catch {
        c.result = "Error";
        c.history = c.input;
      }
    } else if (["+", "-", "×", "÷"].includes(value)) {
      if (c.input === "0" && value === "-") {
        c.input = "-";
      } else {
        c.history = c.input + value;
        c.input += value;
      }
    } else {
      c.input = c.input === "0" ? value : c.input + value;
    }
    setCalcDisplay({ ...c });
  }, []);

  return {
    isOpen,
    toggle,
    canvasRef,
    clear,
    showAI,
    setShowAI,
    aiImage,
    setAiImage,
    exportCanvas,
    calculator: { calcInput, calcDisplay },
  };
};

const Whiteboard = ({ open, onClose, canvasRef: externalCanvasRef } = {}) => {
  const hook = useWhiteboard();
  const {
    isOpen: internalOpen, toggle: internalToggle, canvasRef: internalCanvasRef,
    clear, showAI, setShowAI, aiImage, setAiImage, exportCanvas, calculator,
  } = hook;
  const controlled = typeof open === "boolean";
  const isOpen = controlled ? open : internalOpen;
  const toggle = controlled ? (onClose || (() => {})) : internalToggle;
  const canvasRef = externalCanvasRef || internalCanvasRef;
  const [color, setColor] = useState("#000000");
  const [penSize, setPenSize] = useState("medium");
  const [tool, setTool] = useState("pen");
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isMinimized, setIsMinimized] = useState(false);
  const panelRef = useRef(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let drawing = false;

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches ? e.touches[0] : e;
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    };

    const startDraw = (e) => {
      e.preventDefault();
      drawing = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e) => {
      if (!drawing) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.lineWidth = PEN_SIZES[penSize];
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = tool === "eraser" ? "var(--bg-2)" : color;
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    };

    const stopDraw = () => {
      drawing = false;
      ctx.beginPath();
    };

    canvas.addEventListener("mousedown", startDraw);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDraw);
    canvas.addEventListener("mouseleave", stopDraw);
    canvas.addEventListener("touchstart", startDraw, { passive: false });
    canvas.addEventListener("touchmove", draw, { passive: false });
    canvas.addEventListener("touchend", stopDraw);

    return () => {
      canvas.removeEventListener("mousedown", startDraw);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", stopDraw);
      canvas.removeEventListener("mouseleave", stopDraw);
      canvas.removeEventListener("touchstart", startDraw);
      canvas.removeEventListener("touchmove", draw);
      canvas.removeEventListener("touchend", stopDraw);
    };
  }, [canvasRef, color, penSize, tool]);

  // Dragging
  const handleDragStart = useCallback(
    (e) => {
      const touch = e.touches ? e.touches[0] : e;
      dragOffset.current = {
        x: touch.clientX - position.x,
        y: touch.clientY - position.y,
      };
      setIsDragging(true);
    },
    [position]
  );

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e) => {
      const touch = e.touches ? e.touches[0] : e;
      setPosition({
        x: Math.max(
          0,
          Math.min(window.innerWidth - 60, touch.clientX - dragOffset.current.x)
        ),
        y: Math.max(
          0,
          Math.min(
            window.innerHeight - 60,
            touch.clientY - dragOffset.current.y
          )
        ),
      });
    };
    const handleUp = () => setIsDragging(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleMove);
    window.addEventListener("touchend", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleUp);
    };
  }, [isDragging]);

  const s = {
    toggleBtn: {
      position: "fixed",
      bottom: 24,
      right: 24,
      zIndex: 9999,
      width: 48,
      height: 48,
      borderRadius: "50%",
      background: "var(--primary)",
      border: "none",
      color: "#fff",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 4px 20px rgb(var(--primary-rgb) / 0.5)",
      transition: "transform 0.2s, box-shadow 0.2s",
    },
    panel: {
      position: "fixed",
      left: position.x,
      top: position.y,
      zIndex: 9999,
      width: isMinimized ? 280 : 340,
      background: "var(--bg-2)",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.08)",
      boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
      fontFamily: "system-ui, -apple-system, sans-serif",
      color: "#fff",
      overflow: "hidden",
      transition: "width 0.3s",
    },
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 12px",
      background: "rgb(var(--primary-rgb) / 0.15)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      cursor: "grab",
      userSelect: "none",
    },
    headerBtn: {
      background: "none",
      border: "none",
      color: "#fff",
      cursor: "pointer",
      padding: 4,
      display: "flex",
      alignItems: "center",
      borderRadius: 6,
    },
    toolbar: {
      display: "flex",
      gap: 4,
      padding: "6px 12px",
      background: "rgba(0,0,0,0.2)",
      alignItems: "center",
      flexWrap: "wrap",
    },
    toolBtn: (active) => ({
      background: active ? "var(--primary)" : "rgba(255,255,255,0.06)",
      border: "none",
      color: "#fff",
      cursor: "pointer",
      padding: "4px 8px",
      borderRadius: 6,
      fontSize: 12,
      display: "flex",
      alignItems: "center",
      gap: 4,
    }),
    colorDot: (c) => ({
      width: 18,
      height: 18,
      borderRadius: "50%",
      background: c,
      border: color === c ? "2px solid #fff" : "2px solid transparent",
      cursor: "pointer",
    }),
    sizeBtn: (active) => ({
      background: active ? "var(--primary)" : "rgba(255,255,255,0.06)",
      border: "none",
      color: "#fff",
      cursor: "pointer",
      padding: "2px 8px",
      borderRadius: 6,
      fontSize: 11,
    }),
    canvasWrap: {
      padding: 8,
      display: "flex",
      justifyContent: "center",
      background: "rgba(0,0,0,0.15)",
    },
    canvas: {
      borderRadius: 8,
      border: "1px solid rgba(255,255,255,0.08)",
      cursor: "crosshair",
      background: "var(--bg-2)",
      touchAction: "none",
    },
    calcSection: {
      padding: "8px 12px 12px",
      borderTop: "1px solid rgba(255,255,255,0.06)",
    },
    calcDisplay: {
      background: "rgba(0,0,0,0.3)",
      borderRadius: 8,
      padding: "10px 14px",
      marginBottom: 8,
      textAlign: "right",
      minHeight: 48,
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-end",
    },
    calcHistory: {
      fontSize: 11,
      color: "rgba(255,255,255,0.4)",
      marginBottom: 2,
      minHeight: 14,
    },
    calcInput: {
      fontSize: 22,
      fontWeight: 700,
      letterSpacing: -0.5,
      wordBreak: "break-all",
    },
    calcGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 6,
    },
    calcBtn: (bg = "rgba(255,255,255,0.06)") => ({
      background: bg,
      border: "none",
      color: "#fff",
      cursor: "pointer",
      borderRadius: 8,
      padding: "10px 0",
      fontSize: 16,
      fontWeight: 600,
    }),
  };

  const calcButtons = [
    { label: "C", action: "clear", bg: "#E53E3E" },
    { label: "\u232B", action: "backspace", bg: "rgba(255,255,255,0.1)" },
    { label: "\u00F7", action: "\u00F7", bg: "rgb(var(--primary-rgb) / 0.4)" },
    { label: "\u00D7", action: "\u00D7", bg: "rgb(var(--primary-rgb) / 0.4)" },
    { label: "7", action: "7" },
    { label: "8", action: "8" },
    { label: "9", action: "9" },
    { label: "-", action: "-", bg: "rgb(var(--primary-rgb) / 0.4)" },
    { label: "4", action: "4" },
    { label: "5", action: "5" },
    { label: "6", action: "6" },
    { label: "+", action: "+", bg: "rgb(var(--primary-rgb) / 0.4)" },
    { label: "1", action: "1" },
    { label: "2", action: "2" },
    { label: "3", action: "3" },
    { label: "=", action: "=", bg: "var(--primary)" },
    { label: "0", action: "0", span: 2 },
    { label: ".", action: "." },
  ];

  return (
    <>
      {!controlled && (
      <button
        onClick={toggle}
        style={s.toggleBtn}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.boxShadow = "0 6px 28px rgb(var(--primary-rgb) / 0.7)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 20px rgb(var(--primary-rgb) / 0.5)";
        }}
        title="Whiteboard & Calculator"
      >
        <Calculator size={22} />
      </button>
      )}

      {isOpen && (
        <div ref={panelRef} style={s.panel}>
          <div
            style={s.header}
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Pen size={14} style={{ color: "var(--primary)" }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Whiteboard</span>
            </div>
            <div style={{ display: "flex", gap: 2 }}>
              <button
                style={s.headerBtn}
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? "Expand" : "Minimize"}
              >
                {isMinimized ? (
                  <Maximize2 size={14} />
                ) : (
                  <Minimize2 size={14} />
                )}
              </button>
              <button style={s.headerBtn} onClick={toggle} title="Close">
                <X size={14} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              <div style={s.toolbar}>
                <button
                  style={s.toolBtn(tool === "pen")}
                  onClick={() => setTool("pen")}
                >
                  <Pen size={12} />
                  Pen
                </button>
                <button
                  style={s.toolBtn(tool === "eraser")}
                  onClick={() => setTool("eraser")}
                >
                  <Eraser size={12} />
                  Eraser
                </button>
                <span
                  style={{
                    width: 1,
                    height: 16,
                    background: "rgba(255,255,255,0.1)",
                  }}
                />
                {COLORS.map((c, i) => (
                  <div
                    key={c}
                    style={s.colorDot(c)}
                    onClick={() => {
                      setColor(c);
                      setTool("pen");
                    }}
                    title={COLOR_NAMES[i]}
                  />
                ))}
                <span
                  style={{
                    width: 1,
                    height: 16,
                    background: "rgba(255,255,255,0.1)",
                  }}
                />
                {Object.keys(PEN_SIZES).map((size) => (
                  <button
                    key={size}
                    style={s.sizeBtn(penSize === size)}
                    onClick={() => setPenSize(size)}
                  >
                    {size === "thin" ? "S" : size === "medium" ? "M" : "L"}
                  </button>
                ))}
                <button
                  style={{ ...s.toolBtn(false), marginLeft: "auto" }}
                  onClick={clear}
                  title="Clear canvas"
                >
                  <Trash2 size={12} />
                </button>
                <button
                  style={{ ...s.toolBtn(false), marginLeft: 4, color: "var(--primary)" }}
                  onClick={() => {
                    const img = exportCanvas();
                    if (img) {
                      setAiImage(img);
                      setShowAI(true);
                    }
                  }}
                  title="AI Analysis"
                >
                  <Sparkles size={12} />
                </button>
              </div>

              <div style={s.canvasWrap}>
                <canvas
                  ref={canvasRef}
                  width={300}
                  height={300}
                  style={s.canvas}
                />
              </div>
            </>
          )}

          <div style={s.calcSection}>
            <div style={s.calcDisplay}>
              <div style={s.calcHistory}>{calculator.calcDisplay.history}</div>
              <div style={s.calcInput}>{calculator.calcDisplay.input}</div>
            </div>
            <div style={s.calcGrid}>
              {calcButtons.map((btn) => (
                <button
                  key={btn.label + btn.action}
                  style={{
                    ...s.calcBtn(btn.bg),
                    gridColumn: btn.span ? `span ${btn.span}` : undefined,
                  }}
                  onClick={() => calculator.calcInput(btn.action)}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showAI && aiImage && (
        <WhiteboardAI imageBase64={aiImage} onClose={() => { setShowAI(false); setAiImage(null); }} />
      )}
    </>
  );
};

export { Whiteboard, useWhiteboard };
export default Whiteboard;
