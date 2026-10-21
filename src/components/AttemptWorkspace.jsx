// Full-screen "Attempt" workspace: question + personal whiteboard + math
// palette + AI hint + notepad. Strokes are vector data, so submissions work
// without Firebase Storage and peers can replay the full solving process.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  X, Undo2, Trash2, Pen, Eraser, Type, Sparkles, Loader2,
  Send, Save, NotebookPen, CheckCircle, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "./Toast";
import { askGroq } from "../lib/ai";
import NotepadDrawer from "./NotepadDrawer";
import {
  saveClassSubmission, setSubmissionStatus, createReviewRequest, notifyUser,
} from "../lib/classroom";

const W = 900;
const H = 620;
const COLORS = ["#111827", "#dc2626", "#2563eb", "#059669", "#7c3aed", "#d97706"];
const SIZES = [2, 4, 7, 11];
const MATH = ["√", "π", "∫", "Σ", "≤", "≥", "≠", "θ", "×", "÷", "²", "³", "½", "⅓", "∞"];

function drawStroke(ctx, s) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = s.tool === "eraser" ? "#fbfbf7" : s.color;
  ctx.fillStyle = s.color;
  ctx.lineWidth = s.tool === "eraser" ? Math.max(s.size * 3, 14) : s.size;
  if (s.tool === "text") {
    ctx.font = `700 ${Math.max(18, s.size * 5)}px "Inter", system-ui, sans-serif`;
    ctx.fillText(s.text, s.x, s.y);
  } else if (s.points?.length) {
    ctx.beginPath();
    ctx.moveTo(s.points[0].x, s.points[0].y);
    for (let i = 1; i < s.points.length; i += 1) ctx.lineTo(s.points[i].x, s.points[i].y);
    ctx.stroke();
  }
  ctx.restore();
}

export default function AttemptWorkspace({
  open, onClose, question, classId, sessionId, teacherUid, teacherName,
  teachers = [], initialStrokes = [], readOnly = false, studentName = "",
  remarks = "", onSubmit,
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const canvasRef = useRef(null);
  const [strokes, setStrokes] = useState(initialStrokes || []);
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(4);
  const [drawing, setDrawing] = useState(false);
  const [hint, setHint] = useState("");
  const [hintBusy, setHintBusy] = useState(false);
  const [notepad, setNotepad] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(teacherUid || "");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setStrokes(initialStrokes || []);
      setSaved(false);
      setHint("");
      setMessage("");
      setSelectedTeacher(teacherUid || "");
    }
  }, [open, initialStrokes, teacherUid]);

  const currentStroke = useRef(null);

  function repaint() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#fbfbf7";
    ctx.fillRect(0, 0, W, H);
    strokes.forEach((s) => drawStroke(ctx, s));
    if (currentStroke.current) drawStroke(ctx, currentStroke.current);
  }

  useEffect(() => { repaint(); }, [strokes, open]); // eslint-disable-line react-hooks/exhaustive-deps

  function pos(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    };
  }

  function down(e) {
    if (readOnly) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = pos(e);
    if (tool === "text") {
      const value = window.prompt("Type the equation or label", "");
      if (value?.trim()) {
        setStrokes((prev) => [...prev, { tool: "text", text: value.trim().slice(0, 120), x: p.x, y: p.y, color, size }]);
      }
      return;
    }
    setDrawing(true);
    currentStroke.current = { tool, color, size, points: [p] };
    repaint();
  }

  function move(e) {
    if (!drawing || readOnly) return;
    const p = pos(e);
    const s = currentStroke.current;
    if (!s) return;
    s.points.push(p);
    repaint();
  }

  function up() {
    if (!drawing) return;
    const s = currentStroke.current;
    if (s && s.points.length > 0) {
      setStrokes((prev) => [...prev, { ...s, points: [...s.points] }]);
    }
    currentStroke.current = null;
    setDrawing(false);
  }

  function stamp(symbol) {
    if (readOnly) return;
    setStrokes((prev) => [...prev, {
      tool: "text", text: symbol, x: W / 2 - 20, y: H / 2, color, size,
    }]);
  }

  function undo() {
    if (readOnly) return;
    setStrokes((prev) => prev.slice(0, -1));
  }

  function clear() {
    if (readOnly) return;
    if (!window.confirm("Clear the whole whiteboard?")) return;
    setStrokes([]);
  }

  function thumbnail() {
    const canvas = canvasRef.current;
    if (!canvas) return "";
    try { return canvas.toDataURL("image/jpeg", 0.55); } catch { return ""; }
  }

  async function persist(status) {
    if (!user || !classId || !question?.id) {
      toast({ message: "Open this from a class question to save.", type: "warning" });
      return null;
    }
    setSaving(true);
    try {
      const sid = await saveClassSubmission({
        classId,
        sessionId,
        questionId: question.id,
        studentUid: user.uid,
        studentName: studentName || user.displayName || "Student",
        strokes,
        thumbnail: thumbnail(),
        text: hint,
        status,
      });
      setSaved(true);
      return sid;
    } catch (e) {
      toast({ message: `Save failed: ${e.message}`, type: "error" });
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    const sid = await persist("submitted");
    if (!sid) return;
    try {
      await setSubmissionStatus(sid, "submitted");
      const teacher = teachers.find((t) => t.uid === selectedTeacher);
      if (selectedTeacher) {
        await createReviewRequest({
          studentUid: user.uid,
          studentName: studentName || user.displayName || "Student",
          teacherUid: selectedTeacher,
          teacherName: teacher?.name || teacherName || "Teacher",
          classId,
          submissionId: sid,
          questionId: question?.id,
          message: message || "Please review my working.",
        });
      }
      if (teacherUid && teacherUid !== selectedTeacher) {
        await notifyUser(teacherUid, {
          type: "submission",
          title: `${studentName || user.displayName || "A student"} submitted work`,
          body: question?.question?.slice(0, 120) || "New whiteboard submission",
          link: "/teacher/reviews",
          actorName: studentName || user.displayName,
        });
      }
      toast({ message: "Submitted ✓", type: "success" });
      onSubmit?.(sid);
      onClose?.();
    } catch (e) {
      toast({ message: e.message || "Could not submit", type: "error" });
    }
  }

  async function askHint() {
    if (!question) return;
    setHintBusy(true);
    try {
      const answer = await askGroq(
        "You are a patient exam tutor. Give ONE formula or first-step hint only. Never give the final answer. Keep it under 45 words.",
        `Question: ${question.question}\nOptions: ${JSON.stringify(question.options || {})}\nSubject: ${question.subject || ""}\nTopic: ${question.topic || ""}`,
        { maxTokens: 220 },
      );
      setHint(answer);
    } catch (e) {
      setHint(e.message || "AI is unavailable right now — try again.");
    } finally {
      setHintBusy(false);
    }
  }

  const palette = useMemo(() => COLORS, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col" style={{ background: "var(--bg)" }}>
      <header className="flex items-center gap-2 px-3 py-2 border-b border-border flex-wrap">
        <button onClick={onClose} className="p-2 rounded-lg text-text-muted hover:text-text" aria-label="Close attempt"><X size={18} /></button>
        <span className="text-sm font-black text-text">Attempt</span>
        {question?.topic && <span className="text-xs text-text-muted truncate max-w-[180px]">{question.topic}</span>}
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={() => setNotepad(true)} className="btn-secondary text-xs px-3 py-1.5"><NotebookPen size={14} /> Notepad</button>
          {!readOnly && (
            <>
              <button onClick={() => persist("draft")} disabled={saving} className="btn-secondary text-xs px-3 py-1.5"><Save size={14} /> {saving ? "Saving…" : saved ? "Saved" : "Draft"}</button>
              <button onClick={submit} disabled={saving || strokes.length === 0} className="btn-primary text-xs px-3 py-1.5"><Send size={14} /> Submit</button>
            </>
          )}
        </div>
      </header>

      <div className="flex-1 min-h-0 grid lg:grid-cols-[minmax(280px,38%)_1fr]">
        <section className="overflow-y-auto p-4 border-b lg:border-b-0 lg:border-r border-border">
          <div className="rounded-2xl border border-border p-4" style={{ background: "var(--bg-2)" }}>
            <p className="text-base sm:text-lg font-semibold leading-relaxed text-text">{question?.question || "No question selected."}</p>
            <div className="mt-4 space-y-2">
              {Object.entries(question?.options || {}).map(([letter, text]) => (
                <div key={letter} className="flex gap-3 rounded-xl border border-border px-3 py-2 text-sm text-text">
                  <span className="font-black text-primary">{letter}</span><span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          <button onClick={askHint} disabled={hintBusy} className="btn-secondary w-full mt-3 text-sm">
            {hintBusy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Formula-first hint
          </button>
          {hint && <div className="mt-3 rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm text-text whitespace-pre-wrap">{hint}</div>}

          {!readOnly && (
            <div className="mt-4 space-y-2">
              <label className="text-xs font-bold text-text-muted">ASK A TEACHER TO REVIEW (optional)</label>
              <select value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)} className="input-field text-sm">
                <option value="">Class teacher</option>
                {teachers.map((t) => <option key={t.uid} value={t.uid}>{t.name || t.email || "Teacher"}</option>)}
              </select>
              <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Private message (e.g. please check step 3)" className="input-field text-sm" />
            </div>
          )}

          {remarks && (
            <div className="mt-4 rounded-xl border border-accent/30 bg-accent/10 p-3 text-sm text-text whitespace-pre-wrap">
              <strong className="text-accent">Teacher remark: </strong>{remarks}
            </div>
          )}
        </section>

        <section className="min-h-0 flex flex-col p-2 sm:p-3">
          {!readOnly && (
            <div className="flex flex-wrap items-center gap-1.5 pb-2">
              <button onClick={() => setTool("pen")} className={`p-2 rounded-lg ${tool === "pen" ? "bg-primary text-black" : "bg-bg-3 text-text"}`} title="Pen"><Pen size={15} /></button>
              <button onClick={() => setTool("eraser")} className={`p-2 rounded-lg ${tool === "eraser" ? "bg-primary text-black" : "bg-bg-3 text-text"}`} title="Eraser"><Eraser size={15} /></button>
              <button onClick={() => setTool("text")} className={`p-2 rounded-lg ${tool === "text" ? "bg-primary text-black" : "bg-bg-3 text-text"}`} title="Text"><Type size={15} /></button>
              <span className="w-px h-6 bg-border mx-1" />
              {palette.map((c) => (
                <button key={c} onClick={() => { setColor(c); setTool("pen"); }} style={{ width: 20, height: 20, borderRadius: 99, background: c, border: color === c ? "2px solid var(--text)" : "2px solid transparent" }} aria-label={`Colour ${c}`} />
              ))}
              <span className="w-px h-6 bg-border mx-1" />
              {SIZES.map((s) => (
                <button key={s} onClick={() => setSize(s)} className={`px-2 py-1 rounded-lg text-xs font-bold ${size === s ? "bg-primary text-black" : "bg-bg-3 text-text"}`}>{s}</button>
              ))}
              <span className="w-px h-6 bg-border mx-1" />
              <button onClick={undo} className="p-2 rounded-lg bg-bg-3 text-text" title="Undo"><Undo2 size={15} /></button>
              <button onClick={clear} className="p-2 rounded-lg bg-bg-3 text-text" title="Clear"><Trash2 size={15} /></button>
            </div>
          )}

          <div className="flex-1 min-h-[240px] overflow-auto rounded-xl border border-border bg-[#fbfbf7]">
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={up}
              onPointerLeave={up}
              className="w-full h-auto touch-none select-none"
              style={{ display: "block", cursor: readOnly ? "default" : "crosshair" }}
            />
          </div>

          {!readOnly && (
            <div className="flex gap-1.5 overflow-x-auto pt-2 pb-1">
              {MATH.map((m) => (
                <button key={m} onClick={() => stamp(m)} className="shrink-0 w-9 h-9 rounded-lg bg-bg-3 border border-border text-text text-sm font-bold">{m}</button>
              ))}
            </div>
          )}
          {readOnly && <p className="text-xs text-text-muted pt-2">Read-only preview of the full solving process.</p>}
        </section>
      </div>

      <NotepadDrawer open={notepad} onClose={() => setNotepad(false)} context={question?.question || ""} />
    </div>
  );
}
