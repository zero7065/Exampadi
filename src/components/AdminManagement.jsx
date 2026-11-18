// AdminManagement — management logins are ONLY created for a registered,
// approved school. Creating one also generates a teacher login code for the
// school. Management accounts are school-scoped and invisible to other admins.
import { useState, useEffect } from "react";
import { useToast } from "./Toast";
import {
  createManagementAccount, subscribeManagementAccounts,
  setManagementStatus, deleteManagementAccount,
} from "../lib/management";
import { createTeacherInvite } from "../lib/teacherInvites";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { Shield, Plus, Loader2, Trash2, Power, Building2, Users, Activity, Mail, KeyRound, CheckCircle2 } from "lucide-react";

export default function AdminManagement() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", name: "", schoolId: "" });
  const [issued, setIssued] = useState(null); // { email, password, schoolName, teacherCode }

  async function loadSchools() {
    try {
      const snap = await getDocs(query(collection(db, "schools"), where("status", "==", "approved"), orderBy("createdAt", "desc"), limit(50)));
      setSchools(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      // Fallback: some schools may lack createdAt — load all approved without order.
      try {
        const snap2 = await getDocs(query(collection(db, "schools"), where("status", "==", "approved"), limit(50)));
        setSchools(snap2.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch { /* ignore */ }
    }
  }

  useEffect(() => {
    const unsub = subscribeManagementAccounts(setAccounts);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async school fetch on mount
    loadSchools();
    const t = setTimeout(() => setLoading(false), 400);
    return () => { unsub(); clearTimeout(t); };
  }, []);

  async function handleCreate() {
    if (!form.schoolId) {
      toast({ message: "Select a registered, approved school — management logins require a school", type: "warning" });
      return;
    }
    if (!form.email || !form.password || form.password.length < 6) {
      toast({ message: "Enter an email and password (min 6 chars)", type: "warning" });
      return;
    }
    setCreating(true);
    try {
      const school = schools.find((s) => s.id === form.schoolId);
      const result = await createManagementAccount({
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim() || `${school?.name || "School"} Management`,
        schoolId: form.schoolId,
        schoolName: school?.name || "",
      });
      // Also generate a teacher login code for this school (school onboarding).
      let teacherCode = null;
      try {
        const invite = await createTeacherInvite({
          schoolId: form.schoolId,
          schoolName: school?.name || "",
          createdBy: "admin",
          createdByName: "Admin",
        });
        teacherCode = invite.code;
      } catch (e) {
        console.warn("teacher code generation failed:", e?.message);
      }
      setIssued({ email: result.email, password: result.password, schoolName: result.schoolName, teacherCode });
      setForm({ email: "", password: "", name: "", schoolId: "" });
      toast({ message: "Management login created ✓", type: "success" });
    } catch (e) {
      toast({ message: e.message, type: "error" });
    } finally {
      setCreating(false);
    }
  }

  async function generateTeacherCodeFor(school) {
    try {
      const invite = await createTeacherInvite({
        schoolId: school.id,
        schoolName: school.name || "",
        createdBy: "admin",
        createdByName: "Admin",
      });
      setIssued({ email: null, password: null, schoolName: school.name, teacherCode: invite.code });
      toast({ message: "Teacher login code generated ✓", type: "success" });
    } catch (e) {
      toast({ message: e.message, error: "error" });
    }
  }

  if (loading) return <div style={{ color: "var(--text-muted)", padding: 24 }}>Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="glass-card p-5" style={{ borderColor: "rgb(var(--primary-rgb) / 0.35)" }}>
        <div className="flex items-center gap-2 mb-2">
          <Shield size={18} className="text-primary" />
          <h3 className="font-black text-text">Management logins</h3>
        </div>
        <p className="text-xs text-text-muted mb-3" style={{ lineHeight: 1.5 }}>
          Management logins exist <strong>only for a registered, approved school</strong>. They approve their school, pull sync, message their community, and never see other schools or other admins. Creating one also issues a teacher login code for the school.
          Admins can preview any school's management dashboard — use the <strong>Open dashboard</strong> button next to each approved school below.
        </p>

        <label className="text-xs font-bold text-text-muted mb-1 block">Registered school (required)</label>
        <select value={form.schoolId} onChange={(e) => setForm({ ...form, schoolId: e.target.value })} className="input-field mb-2">
          <option value="">Select an approved school…</option>
          {schools.map((s) => <option key={s.id} value={s.id}>{s.name || "Unnamed school"} · {s.id.slice(0, 8)}</option>)}
        </select>
        {schools.length === 0 && (
          <p className="text-[11px] mb-2" style={{ color: "var(--accent)" }}>
            No approved schools yet. Register a school at <a href="/schools/signup" style={{ color: "var(--primary)", fontWeight: 700 }}>/schools/signup</a> and approve it in the schools queue first.
          </p>
        )}

        <div className="grid sm:grid-cols-3 gap-2">
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Management email (login)" className="input-field" />
          <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} type="text" placeholder="Temp password (min 6)" className="input-field" />
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Display name (optional)" className="input-field" />
        </div>
        <button onClick={handleCreate} disabled={creating || !form.schoolId} className="btn-primary px-5 mt-2 disabled:opacity-50">
          {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Create management login
        </button>

        {issued && (
          <div className="mt-3 p-3 rounded-xl space-y-1.5" style={{ background: "rgb(var(--success-rgb) / 0.08)", border: "1px solid rgba(74,222,128,0.4)" }}>
            <div className="text-xs font-black flex items-center gap-1" style={{ color: "var(--success)" }}><CheckCircle2 size={13} /> Save these now — shown once</div>
            {issued.schoolName && <div className="text-xs text-text">School: <strong>{issued.schoolName}</strong></div>}
            {issued.email && <div className="text-xs text-text">Management email: <code>{issued.email}</code></div>}
            {issued.password && <div className="text-xs text-text">Temp password: <code>{issued.password}</code></div>}
            {issued.teacherCode && <div className="text-xs text-text">Teacher login code: <code className="font-black" style={{ color: "var(--primary)" }}>{issued.teacherCode}</code></div>}
            <div className="text-[10px] text-text-muted">Management logs in at /auth with the email + password. Teachers redeem the code at /teacher/register.</div>
          </div>
        )}
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
              <div className="text-xs text-text-muted flex items-center gap-1"><Building2 size={10} /> {a.schoolName || "—"}</div>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${a.active !== false ? "bg-green-500/15 text-green-500" : "bg-gray-500/15 text-gray-500"}`}>
              {a.active !== false ? "ACTIVE" : "DISABLED"}
            </span>
            <button onClick={() => setManagementStatus(a.id, a.active === false)} className="p-2 rounded-lg hover:bg-subtle" title={a.active === false ? "Enable" : "Disable"}><Power size={14} /></button>
            <button onClick={() => { if (confirm("Disable this login permanently?")) deleteManagementAccount(a.id); }} className="p-2 rounded-lg hover:bg-subtle text-danger" title="Revoke"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>

      {/* School oversight */}
      <h3 className="font-black text-xs uppercase tracking-widest text-text-muted flex items-center gap-1"><Activity size={12} /> Schools ({schools.length} approved)</h3>
      <div className="grid sm:grid-cols-2 gap-2">
        {schools.map((s) => (
          <div key={s.id} className="glass-card p-4">
            <div className="font-bold text-sm text-text flex items-center gap-1"><Building2 size={13} /> {s.name || "Unnamed school"}</div>
            <div className="text-xs text-text-muted mt-0.5">{s.contactEmail || "No contact"} · {s.status}</div>
            <div className="text-[10px] mt-1 text-text-muted">Management ID: <span className="font-mono">{s.id?.slice(0, 10)}</span></div>
            <div className="flex gap-2 mt-2 flex-wrap">
              <a href={`/management?school=${s.id}`} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1">
                <Activity size={12} /> Open dashboard
              </a>
              <button onClick={() => generateTeacherCodeFor(s)} className="btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1">
                <KeyRound size={12} /> Generate teacher code
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}