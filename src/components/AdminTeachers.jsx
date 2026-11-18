import { useState, useEffect } from "react";
import { GraduationCap, Plus, Copy, Trash2, Loader2, Users, ShieldOff } from "lucide-react";
import { createTeacherInvite, listTeacherInvites, revokeTeacherInvite } from "../lib/teacherInvites";
import { listSchools } from "../lib/schools";
import { collection, query, where, getDocs, doc, updateDoc, limit } from "firebase/firestore";
import { db } from "../firebaseConfig";

export default function AdminTeachers() {
  const [invites, setInvites] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [schoolName, setSchoolName] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [approvedSchools, setApprovedSchools] = useState([]);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(null);

  async function loadTeachers() {
    try {
      const snap = await getDocs(query(collection(db, "users"), where("role", "==", "teacher"), limit(200)));
      setTeachers(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
    } catch (e) {
      console.warn("load teachers:", e.message);
    }
  }

  async function revokeTeacher(uid) {
    if (!confirm("Revoke teacher access for this account? They become a normal student account.")) return;
    try {
      await updateDoc(doc(db, "users", uid), { role: "user", accountType: "student" });
      setTeachers((list) => list.filter((t) => t.uid !== uid));
    } catch (e) {
      console.warn("revoke teacher:", e.message);
    }
  }

  async function load() {
    try {
      const data = await listTeacherInvites();
      setInvites(data);
    } catch (e) {
      console.error("Failed to load invites:", e);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const data = await listTeacherInvites();
        if (!cancelled) setInvites(data);
      } catch (e) {
        console.error("Failed to load invites:", e);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch teacher accounts on mount
    loadTeachers();
    // Approved schools power the picker — their doc ids become users.schoolId.
    listSchools("approved")
      .then((data) => { if (!cancelled) setApprovedSchools(data); })
      .catch(() => { if (!cancelled) setApprovedSchools([]); });
    return () => { cancelled = true; };
  }, []);

  async function handleCreate() {
    const name = schoolName.trim();
    if (!name && !schoolId) return;
    setCreating(true);
    try {
      const invite = await createTeacherInvite({
        schoolId: schoolId || null,
        schoolName: name || approvedSchools.find((s) => s.id === schoolId)?.schoolName || "",
        createdBy: "admin",
        createdByName: "Admin",
      });
      setSchoolName("");
      setSchoolId("");
      await load();
      setCopied(invite.code);
      setTimeout(() => setCopied(null), 3000);
    } catch (e) {
      console.error("Failed to create invite:", e);
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id) {
    if (!window.confirm("Revoke this invite code?")) return;
    await revokeTeacherInvite(id);
    await load();
  }

  return (
    <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <GraduationCap size={18} color="var(--primary)" />
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>Teacher Invite Codes</span>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {approvedSchools.length > 0 && (
          <select
            value={schoolId}
            onChange={(e) => {
              setSchoolId(e.target.value);
              const s = approvedSchools.find((x) => x.id === e.target.value);
              setSchoolName(s ? s.schoolName : "");
            }}
            style={{ flex: 1, minWidth: 200, padding: "10px 14px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid #333", color: "var(--text)", fontSize: 13, outline: "none" }}
          >
            <option value="">Select approved school…</option>
            {approvedSchools.map((s) => (
              <option key={s.id} value={s.id}>{s.schoolName || s.id}</option>
            ))}
          </select>
        )}
        <input
          value={schoolName}
          onChange={(e) => {
            setSchoolName(e.target.value);
            setSchoolId("");
          }}
          placeholder={approvedSchools.length > 0 ? "…or type a school name" : "School name (e.g., Jos High School)"}
          style={{ flex: 1, minWidth: 200, padding: "10px 14px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid #333", color: "var(--text)", fontSize: 13, outline: "none" }}
        />
        <button onClick={handleCreate} disabled={creating || (!schoolName.trim() && !schoolId)} style={{ padding: "10px 20px", borderRadius: 8, background: "var(--primary)", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: creating ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, opacity: creating || (!schoolName.trim() && !schoolId) ? 0.6 : 1 }}>
          {creating ? <Loader2 size={16} /> : <Plus size={16} />} Generate Code
        </button>
      </div>

      {copied && (
        <div style={{ padding: 12, borderRadius: 8, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <code style={{ color: "#4ADE80", fontWeight: 700, fontSize: 14 }}>{copied}</code>
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>— share this with the teacher</span>
        </div>
      )}

      {invites.length === 0 ? (
        <div style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: 20 }}>No active invite codes</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Code", "School", "Expires", "Actions"].map((h) => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invites.map((inv) => (
                <tr key={inv.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 12px" }}><code style={{ color: "var(--accent)", fontWeight: 700 }}>{inv.code}</code></td>
                  <td style={{ padding: "10px 12px", color: "var(--text)" }}>{inv.schoolName}</td>
                  <td style={{ padding: "10px 12px", color: "var(--text-muted)" }}>{new Date(inv.expiresAt).toLocaleDateString()}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => { navigator.clipboard.writeText(inv.code); setCopied(inv.code); setTimeout(() => setCopied(null), 2000); }} style={{ background: "none", border: "1px solid #333", borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: "var(--text-muted)" }}>
                        <Copy size={14} />
                      </button>
                      <button onClick={() => handleRevoke(inv.id)} style={{ background: "none", border: "1px solid #333", borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: "#FF4D6A" }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Teacher accounts — admin oversight */}
      <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Users size={16} color="var(--primary)" />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>Teacher Accounts ({teachers.length})</span>
        </div>
        {teachers.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: 16 }}>No teacher accounts yet</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {teachers.map((t) => (
              <div key={t.uid} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: "var(--bg-3)", flexWrap: "wrap" }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgb(var(--accent-rgb) / 0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", fontWeight: 800, fontSize: 13 }}>
                  {(t.name || t.email || "T")[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{t.name || "Teacher"}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t.email} · {t.schoolName || (t.schoolId?.startsWith("personal_") ? "Independent" : t.schoolId || "No school")}</div>
                </div>
                <button onClick={() => revokeTeacher(t.uid)} title="Revoke teacher access" style={{ background: "rgba(255,77,106,0.1)", border: "1px solid rgba(255,77,106,0.3)", borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: "#FF4D6A", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                  <ShieldOff size={12} /> Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
