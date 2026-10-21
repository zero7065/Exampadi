// Collapsible notepad + AI drawer used on whiteboard, classroom and exam screens.
import { useEffect, useMemo, useRef, useState } from "react";
import { X, NotebookPen, Sparkles, Bell, Loader2, Send, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "./Toast";
import { askGroq } from "../lib/ai";
import { createReminder } from "../lib/reminders";

export default function NotepadDrawer({ open, onClose, context = "" }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState("notes");
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [dueAt, setDueAt] = useState(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setMinutes(0, 0, 0);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const saveTimer = useRef(null);
  const storageKey = useMemo(() => `ep_notepad_${user?.uid || "guest"}`, [user?.uid]);

  useEffect(() => {
    if (!open) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setText(saved);
    } catch { /* ignore */ }
  }, [open, storageKey]);

  useEffect(() => {
    if (!open) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try { localStorage.setItem(storageKey, text); } catch { /* ignore */ }
    }, 350);
    return () => clearTimeout(saveTimer.current);
  }, [text, open, storageKey]);

  async function runAI(kind) {
    const notes = text.trim();
    if (!notes && !prompt.trim()) {
      toast({ message: "Write something first", type: "warning" });
      return;
    }
    setBusy(true);
    setTab("ai");
    const instruction = kind || prompt.trim() || "Summarise my notes and list three things to revise.";
    try {
      const answer = await askGroq(
        "You are ExamPadi's study notepad assistant. Be concise, use bullet points, and never invent facts. If asked to quiz, give questions then answers. Keep the student's own notes as the source of truth.",
        `${instruction}\n\nContext: ${context || "general study"}\n\nStudent notes:\n${notes || "(none yet)"}`,
        { maxTokens: 900 },
      );
      setMessages((prev) => [...prev, { role: "user", text: instruction }, { role: "assistant", text: answer }]);
      setPrompt("");
    } catch (e) {
      toast({ message: e.message || "AI is unavailable right now", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function remind() {
    if (!user) { toast({ message: "Sign in to set reminders", type: "warning" }); return; }
    if (!text.trim()) { toast({ message: "Write a note first", type: "warning" }); return; }
    try {
      await createReminder({
        uid: user.uid,
        title: text.trim().split("\n")[0].slice(0, 100),
        body: text.trim().slice(0, 400),
        dueAt: new Date(dueAt),
        link: "/dashboard",
      });
      toast({ message: "Reminder set ✓", type: "success" });
    } catch (e) {
      toast({ message: e.message, type: "error" });
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[85]" role="dialog" aria-modal="true">
      <button aria-label="Close notepad" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <aside
        className="absolute right-0 top-0 h-full w-full sm:w-[400px] flex flex-col border-l border-border shadow-2xl"
        style={{ background: "var(--bg-2)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <header className="flex items-center justify-between p-3 border-b border-border">
          <div className="flex items-center gap-2 font-bold text-text"><NotebookPen size={17} className="text-primary" /> Notepad</div>
          <div className="flex items-center gap-1">
            <button onClick={() => setTab("notes")} className={`px-2 py-1 rounded-lg text-xs font-bold ${tab === "notes" ? "bg-primary/15 text-primary" : "text-text-muted"}`}>Notes</button>
            <button onClick={() => setTab("ai")} className={`px-2 py-1 rounded-lg text-xs font-bold ${tab === "ai" ? "bg-primary/15 text-primary" : "text-text-muted"}`}>AI</button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text"><X size={18} /></button>
          </div>
        </header>

        {tab === "notes" ? (
          <>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Jot the formula, the step you got stuck on, or a question for your teacher…"
              className="flex-1 resize-none bg-transparent p-4 text-sm text-text outline-none"
            />
            <div className="p-3 border-t border-border space-y-2">
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => runAI("Summarise these notes in 5 bullets.")} disabled={busy} className="btn-secondary text-xs px-3 py-1.5"><Sparkles size={13} /> Summarise</button>
                <button onClick={() => runAI("Explain the hardest idea in these notes simply.")} disabled={busy} className="btn-secondary text-xs px-3 py-1.5">Explain</button>
                <button onClick={() => runAI("Quiz me with 5 questions from these notes. Put answers after the questions.")} disabled={busy} className="btn-secondary text-xs px-3 py-1.5">Quiz me</button>
                <button onClick={() => setText("")} className="btn-secondary text-xs px-3 py-1.5 ml-auto"><Trash2 size={13} /> Clear</button>
              </div>
              <div className="flex gap-2 items-center">
                <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="input-field text-xs py-2" />
                <button onClick={remind} className="btn-primary text-xs px-3 py-2 whitespace-nowrap"><Bell size={13} /> Remind</button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.length === 0 && <p className="text-sm text-text-muted">Ask the AI to explain, summarise, quiz you, or turn these notes into a study plan.</p>}
              {messages.map((m, i) => (
                <div key={i} className={`rounded-2xl p-3 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary/10 text-text ml-8" : "bg-bg-3 text-text mr-4"}`}>
                  {m.text}
                </div>
              ))}
              {busy && <div className="flex items-center gap-2 text-sm text-text-muted"><Loader2 size={14} className="animate-spin" /> Thinking…</div>}
            </div>
            <div className="p-3 border-t border-border flex gap-2">
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); runAI(); } }}
                placeholder="Ask about your notes…"
                className="input-field text-sm"
              />
              <button onClick={() => runAI()} disabled={busy} className="btn-primary px-3"><Send size={15} /></button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
