// AdminManagement — create management logins, oversee school performance.
// Management accounts are school-scoped, invisible to other admins.
import { useState, useEffect } from "react";
import { useToast } from "./Toast";
import { useAuth } from "../context/AuthContext";
import {
  createManagementAccount, subscribeManagementAccounts,
  setManagementStatus, deleteManagementAccount,
} from "../lib/management";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { Shield, Plus, Loader2, Trash2, Power, Building2, Users, Activity, Mail } from "lucide-react";

export default function AdminManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", name: "", schoolId: "", schoolName: "" });

  useEffect(() => {
    const unsub = subscribeManagementAccounts(setAccounts);
    loadSchools();
    const t = setTimeout(() => setLoading(false), 400);
    return () => { unsub(); clearTimeout(t); };
  }, []);

  async function loadSchools() {
    try {
      const snap = await getDocs(query(collection(db, "schools"), orderBy("createdAt", "desc"), limit(50)));
      setSchools(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) { console.warn(e); }
  }

  async function handleCreate() {
    if (!form.email || !form.password || form.password.length < 6) {
      toast({ message: "Enter an email and password (min 6 chars)", type: "warning" });
      return;
    }
    setCreating(true);
    try {
      await createManagementAccount({
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim() || "School Management",
        schoolId: form.schoolId || null,
        schoolName: form.schoolName || "",
      });
      toast({ message: "Management account created ✓ — they can log in at /auth with this email", type: "success" });
      setForm({ email: "", password: "", name: "", schoolId: "", schoolName: "" });
    } catch (e) {
      const msg = e.code === "auth/email-already-in-use" ? "Email already in use" : e.message;
      toast({ message: msg, type: "error" });
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <div style={{ color: "var(--text-muted)", padding: 24 }}>Loading…</div>;

  return (
    <div className="space-y-4">
      {/* Create management login */}
      <div className="glass-card p-5" style={{ borderColor: "rgb(var(--primary-rgb) / 0.35)" }}>
        <div className="flex items-center gap-2 mb-3">
          <Shield size={18} className="text-primary" />
          <h3 className="font-black text-text">Create a management login</h3>
        </div>
        <p className="text-xs text-text-muted mb-3" style={{ lineHeight: 1.5 }}>
          Management accounts are school-scoped logins (email + password). They approve schools, pull sync, and message their school — but never see other schools or other admins.
        </p>
        <div className="grid sm:grid-cols-2 gap-2 mb-2">
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email (login)" className="input-field" />
          <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} type="password" placeholder="Password (min 6)" className="input-field" />
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Display name" className="input-field" />
          <select value={form.schoolId} onChange={(e) => {
            const s = schools.find((x) => x.id === e.target.value);
            setForm({ ...form, schoolId: e.target.value, schoolName: s?.name || "" });
          }} className="input-field">
            <option value="">No school (global)</option>
            {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <button onClick={handleCreate} disabled={creating} className="btn-primary px-5 mt-2">
          {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Create login
        </button>
      </div>

      {/* Management accounts list */}
      <h3 className="font-black text-xs uppercase tracking-widest text-text-muted flex items-center gap-1"><Users size={12} /> Management logins ({accounts.length})</h3>
      {accounts.length === 0 && <p className="text-sm text-text-muted">No management logins yet.</p>}
      <div className="space-y-2">
        {accounts.map((a) => (
          <div key={a.id} className="glass-card p-4 flex items-center gap-3 flex-wrap" style={{ opacity: a.active === false ? 0.5 : 1 }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgb(var(--primary-rgb) / 0.15)" }}>
              <Mail size={16} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-text">{a.name} <span className="text-xs font-normal text-text-muted">· {a.email}</span></div>
              <div className="text-xs text-text-muted flex items-center gap-1">
                <Building2 size={10} /> {a.schoolName || "Global (all schools)"}
              </div>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${a.active !== false ? "bg-green-500/15 text-green-500" : "bg-gray-500/15 text-gray-500"}`}>
              {a.active !== false ? "ACTIVE" : "DISABLED"}
            </span>
            <button onClick={() => setManagementStatus(a.id, a.active === false)} className="p-2 rounded-lg hover:bg-subtle" title={a.active === false ? "Enable" : "Disable"}>
              <Power size={14} />
            </button>
            <button onClick={() => { if (confirm("Disable this login permanently?")) deleteManagementAccount(a.id); }} className="p-2 rounded-lg hover:bg-subtle text-danger" title="Revoke">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* School overview */}
      <h3 className="font-black text-xs uppercase tracking-widest text-text-muted flex items-center gap-1"><Activity size={12} /> Schools ({schools.length})</h3>
      <div className="grid sm:grid-cols-2 gap-2">
        {schools.map((s) => (
          <div key={s.id} className="glass-card p-4">
            <div className="font-bold text-sm text-text flex items-center gap-1"><Building2 size={13} /> {s.name}</div>
            <div className="text-xs text-text-muted mt-0.5">{s.contactEmail || "No contact"} · {s.status || "pending"}</div>
            <div className="text-[10px] mt-1 text-text-muted">Management ID: <span className="font-mono">{s.id?.slice(0, 8)}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}