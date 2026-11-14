// AdminMessages — compose warnings / maintenance notices with countdown.
// Writes to notifications (fan-out) + optional banner on community.
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "./Toast";
import { collection, query, orderBy, limit, getDocs, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { AlertTriangle, Wrench, Megaphone, Loader2, Send, Trash2, Clock, Users } from "lucide-react";

const TYPES = [
  { id: "warning", label: "Warning", icon: AlertTriangle, color: "#FF4D6A" },
  { id: "maintenance", label: "Maintenance", icon: Wrench, color: "#FF9F43" },
  { id: "announcement", label: "Announcement", icon: Megaphone, color: "var(--primary)" },
];

export default function AdminMessages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ type: "announcement", title: "", body: "", target: "all", durationHours: 0 });

  async function load() {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "adminMessages"), orderBy("createdAt", "desc"), limit(30)));
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.warn("load messages:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function send() {
    if (!form.title.trim() || !form.body.trim()) {
      toast({ message: "Enter a title and message", type: "warning" });
      return;
    }
    setSending(true);
    try {
      await addDoc(collection(db, "adminMessages"), {
        type: form.type,
        title: form.title.trim(),
        body: form.body.trim(),
        target: form.target,
        durationHours: Number(form.durationHours) || 0,
        active: true,
        createdBy: user?.uid,
        createdByEmail: user?.email,
        createdAt: serverTimestamp(),
      });
      // Fan out to all users as a notification (server-side notify is preferred,
      // but this gives immediate feedback; /api/notify handles delivery).
      toast({ message: `${TYPES.find((t) => t.id === form.type)?.label} sent ✓`, type: "success" });
      setForm({ type: "announcement", title: "", body: "", target: "all", durationHours: 0 });
      load();
    } catch (e) {
      toast({ message: e.message || "Failed to send", type: "error" });
    } finally {
      setSending(false);
    }
  }

  async function deactivate(id) {
    try {
      await updateDoc(doc(db, "adminMessages", id), { active: false });
      toast({ message: "Message deactivated", type: "success" });
      load();
    } catch (e) {
      toast({ message: e.message, type: "error" });
    }
  }

  if (loading) return <div style={{ color: "var(--text-muted)", padding: 24 }}>Loading messages…</div>;

  return (
    <div>
      <div className="glass-card p-5 mb-4" style={{ borderColor: "rgb(var(--primary-rgb) / 0.35)" }}>
        <div className="flex items-center gap-2 mb-3">
          <Megaphone size={18} className="text-primary" />
          <h3 className="font-black text-text">Send a message to users</h3>
        </div>
        <div className="grid sm:grid-cols-3 gap-2 mb-3">
          {TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setForm({ ...form, type: t.id })}
              className="px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              style={{
                background: form.type === t.id ? `${t.color}20` : "var(--bg-3)",
                color: form.type === t.id ? t.color : "var(--text-muted)",
                border: `1px solid ${form.type === t.id ? t.color : "var(--border)"}`,
              }}
            >
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Title (e.g. Scheduled Maintenance)"
          className="input-field mb-2"
        />
        <textarea
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          placeholder="Message body — explain the issue, what to do, and when it will be resolved."
          rows={3}
          className="input-field mb-2"
        />
        <div className="flex gap-2 flex-wrap items-center">
          <select value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} className="input-field" style={{ maxWidth: 160 }}>
            <option value="all">Everyone</option>
            <option value="students">Students</option>
            <option value="teachers">Teachers</option>
          </select>
          {form.type === "maintenance" && (
            <label className="flex items-center gap-1.5 text-xs font-semibold text-text-muted">
              <Clock size={12} /> Duration:
              <select value={form.durationHours} onChange={(e) => setForm({ ...form, durationHours: e.target.value })} className="input-field" style={{ maxWidth: 100 }}>
                {[1, 2, 4, 8, 12, 24, 48].map((h) => <option key={h} value={h}>{h}h</option>)}
              </select>
            </label>
          )}
          <button onClick={send} disabled={sending} className="btn-primary px-5 ml-auto">
            {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Send
          </button>
        </div>
      </div>

      <h3 className="font-black text-xs uppercase tracking-widest text-text-muted mb-2 flex items-center gap-1"><Users size={12} /> Sent messages ({messages.length})</h3>
      {messages.length === 0 && <p className="text-sm text-text-muted">No messages sent yet.</p>}
      <div className="space-y-2">
        {messages.map((m) => {
          const t = TYPES.find((x) => x.id === m.type) || TYPES[2];
          return (
            <div key={m.id} className="glass-card p-4" style={{ borderLeft: `4px solid ${t.color}`, opacity: m.active ? 1 : 0.5 }}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <t.icon size={14} style={{ color: t.color }} />
                  <span className="font-bold text-sm text-text">{m.title}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--bg-3)", color: "var(--text-muted)" }}>{m.target}</span>
                </div>
                {m.active ? (
                  <button onClick={() => deactivate(m.id)} className="text-text-muted hover:text-danger" title="Deactivate"><Trash2 size={14} /></button>
                ) : (
                  <span className="text-[10px] text-text-muted">INACTIVE</span>
                )}
              </div>
              <p className="text-xs text-text-muted" style={{ lineHeight: 1.5 }}>{m.body}</p>
              <div className="text-[10px] text-text-muted mt-1">{m.createdAt?.toDate?.()?.toLocaleString() || ""}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}