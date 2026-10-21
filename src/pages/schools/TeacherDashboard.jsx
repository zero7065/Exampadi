// Teacher dashboard: class selector, heatmap, leaderboard, weak topics,
// class creation + invites, drill-down with teacher notes.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import { getUserProfile } from "../../lib/userProfile";
import {
  listSchoolClasses, createClass, createClassInvite, getClass,
  saveTeacherNote, getTeacherNote,
} from "../../lib/schools";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import AvatarDisplay from "../../components/Avatar/AvatarDisplay";
import {
  Users, Plus, FileText, MonitorPlay, ClipboardList, X, Send, Trophy, Sparkles, Megaphone, BookOpenCheck,
} from "lucide-react";
import { createAssignment, createAnnouncement, listAssignmentsForTeacher, listAnnouncementsForSchool } from "../../lib/teacherContent";
import { askGroq } from "../../lib/ai";
import TeacherTools from "../../components/TeacherTools";

function cellColor(acc) {
  if (acc === null) return "var(--bg-3)";
  if (acc >= 80) return "#16a34a";
  if (acc >= 60) return "#eab308";
  if (acc >= 40) return "#f97316";
  return "#ef4444";
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [roster, setRoster] = useState([]); // [{uid,name,photoURL,xp,streak,topics:{topic:{c,t}}}]
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newClass, setNewClass] = useState({ name: "", subject: "" });
  const [inviteCode, setInviteCode] = useState("");
  const [drill, setDrill] = useState(null); // {student, topic}
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (user) getUserProfile(user.uid).then(setProfile).catch(() => {});
  }, [user]);

  const schoolId = profile?.schoolId;

  useEffect(() => {
    if (!schoolId) { setLoading(false); return; }
    listSchoolClasses(schoolId).then((cs) => {
      setClasses(cs);
      if (cs.length > 0) setClassId(cs[0].id);
      setLoading(false);
    }).catch((e) => {
      toast({ message: `Failed to load classes: ${e.message}`, type: "error" });
      setLoading(false);
    });
  }, [schoolId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!classId) { setRoster([]); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const cls = await getClass(classId);
        const uids = (cls?.students || []).slice(0, 60);
        const topicCounts = {};

        // Firestore allows 50 concurrent reads per getDocs batch; run 25
        // students at a time so the 2-reads-per-student load never trips the
        // limit. A serial loop here used to take ~120 round-trips.
        const CHUNK = 25;
        const rows = [];
        for (let i = 0; i < uids.length; i += CHUNK) {
          if (cancelled) return;
          const chunk = uids.slice(i, i + CHUNK);
          const chunkRows = await Promise.all(
            chunk.map(async (uid) => {
              const [prof, sesSnap] = await Promise.all([
                getUserProfile(uid).catch(() => null),
                getDocs(query(collection(db, "sessions"), where("userId", "==", uid), limit(20)))
                  .catch(() => ({ docs: [] })),
              ]);
              const agg = {};
              sesSnap.docs.forEach((d) => {
                const logs = d.data().questionLog || [];
                logs.forEach((l) => {
                  const key = l.t || "General";
                  agg[key] = agg[key] || { c: 0, t: 0 };
                  agg[key].t += 1;
                  if (l.ok) agg[key].c += 1;
                  topicCounts[key] = (topicCounts[key] || 0) + 1;
                });
              });
              return {
                uid,
                name: prof?.name || "Student",
                photoURL: prof?.photoURL || null,
                avatarPreset: prof?.avatarPreset || null,
                xp: prof?.totalXP || 0,
                streak: prof?.streak || 0,
                topics: agg,
              };
            })
          );
          rows.push(...chunkRows);
        }
        if (cancelled) return;
        rows.sort((a, b) => a.name.localeCompare(b.name));
        const topTopics = Object.entries(topicCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([t]) => t);
        setTopics(topTopics);
        setRoster(rows);
      } catch (e) {
        if (!cancelled) toast({ message: `Failed to load roster: ${e.message}`, type: "error" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [classId]); // eslint-disable-line react-hooks/exhaustive-deps

  const weakTopics = useMemo(() => {
    const totals = roster.reduce((acc, r) => {
      Object.entries(r.topics).forEach(([t, v]) => {
        const prev = acc[t] || { c: 0, t: 0 };
        acc[t] = { c: prev.c + v.c, t: prev.t + v.t };
      });
      return acc;
    }, {});
    return Object.entries(totals)
      .map(([t, v]) => ({ topic: t, acc: v.t ? Math.round((v.c / v.t) * 100) : null }))
      .filter((x) => x.acc !== null && x.acc < 60)
      .sort((a, b) => a.acc - b.acc)
      .slice(0, 5);
  }, [roster]);

  const leaders = useMemo(() => [...roster].sort((a, b) => b.xp - a.xp).slice(0, 10), [roster]);

  async function handleCreateClass(e) {
    e.preventDefault();
    if (!newClass.name.trim() || !newClass.subject.trim()) {
      toast({ message: "Class name and subject are required", type: "warning" });
      return;
    }
    try {
      const id = await createClass(schoolId, { name: newClass.name.trim(), subject: newClass.subject.trim(), createdBy: user.uid });
      toast({ message: "Class created ✓", type: "success" });
      setNewClass({ name: "", subject: "" });
      setShowCreate(false);
      const cs = await listSchoolClasses(schoolId);
      setClasses(cs);
      setClassId(id);
    } catch (err) {
      toast({ message: `Failed: ${err.message}`, type: "error" });
    }
  }

  async function handleInvite() {
    if (!classId) return;
    try {
      const code = await createClassInvite({ classId, schoolId, createdBy: user.uid });
      setInviteCode(code);
      toast({ message: `Invite code: ${code} — share with students`, type: "success" });
    } catch (err) {
      toast({ message: `Invite failed: ${err.message}`, type: "error" });
    }
  }

  async function openDrill(student, topic) {
    setDrill({ student, topic });
    setNote("");
    try {
      const n = await getTeacherNote(classId, student.uid);
      if (n?.note) setNote(n.note);
    } catch { /* no existing note */ }
  }

  async function saveNote() {
    if (!drill) return;
    setSavingNote(true);
    try {
      await saveTeacherNote({ schoolId, classId, studentUid: drill.student.uid, authorUid: user.uid, note });
      toast({ message: "Note saved ✓", type: "success" });
    } catch (e) {
      toast({ message: `Save failed: ${e.message}`, type: "error" });
    } finally {
      setSavingNote(false);
    }
  }

  if (loading && classes.length === 0) {
    return <div className="page-content" style={{ color: "var(--text-muted)" }}>Loading teacher dashboard…</div>;
  }

  if (!schoolId) {
    return (
      <div className="page-content max-w-2xl mx-auto text-center space-y-4">
        <h1 className="text-2xl font-black text-text">Teacher Dashboard</h1>
        <p className="text-text-muted">Your account isn't linked to a school yet. Ask your admin to assign your teacher role and school, or register one below.</p>
        <Link to="/schools/signup" className="btn-primary inline-flex px-6">Register a school</Link>
      </div>
    );
  }

  return (
    <div className="page-content max-w-6xl mx-auto space-y-6">
      <header className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-black text-text">Teacher Dashboard</h1>
          <p className="text-sm text-text-muted">{roster.length} students · {topics.length} tracked topics</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className="input-field" style={{ maxWidth: 220 }}>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.subject}</option>)}
          </select>
          <button onClick={() => setShowCreate(true)} className="btn-secondary px-4 text-sm"><Plus size={15} /> Class</button>
          <button onClick={handleInvite} className="btn-secondary px-4 text-sm"><Users size={15} /> Invite code</button>
        </div>
      </header>

      {inviteCode && (
        <div className="glass-card p-4 flex items-center gap-3 flex-wrap">
          <span className="text-sm text-text-muted">Share this code — students join at <strong>/join</strong>:</span>
          <code className="text-xl font-black tracking-widest text-primary bg-primary/10 px-4 py-2 rounded-xl">{inviteCode}</code>
        </div>
      )}

      {showCreate && (
        <form onSubmit={handleCreateClass} className="glass-card p-5 flex flex-col sm:flex-row gap-3">
          <input value={newClass.name} onChange={(e) => setNewClass({ ...newClass, name: e.target.value })} placeholder="Class name (e.g. SS3 A)" className="input-field flex-1" />
          <input value={newClass.subject} onChange={(e) => setNewClass({ ...newClass, subject: e.target.value })} placeholder="Subject" className="input-field flex-1" />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary px-5">Create</button>
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary px-5">Cancel</button>
          </div>
        </form>
      )}

      {/* Weak topics */}
      {weakTopics.length > 0 && (
        <section>
          <h2 className="font-black text-text mb-3">Weak topics (class accuracy &lt; 60%)</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {weakTopics.map((w) => (
              <div key={w.topic} className="glass-card p-4 text-center">
                <div className="text-2xl font-black" style={{ color: cellColor(w.acc) }}>{w.acc}%</div>
                <div className="text-sm font-semibold text-text mt-1">{w.topic}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Heatmap */}
      <section className="glass-card p-5 overflow-x-auto">
        <h2 className="font-black text-text mb-3">Class heatmap <span className="text-xs font-medium text-text-muted">(click a cell for details)</span></h2>
        {roster.length === 0 ? (
          <p className="text-sm text-text-muted">No students yet — share the invite code above.</p>
        ) : (
          <table style={{ borderCollapse: "separate", borderSpacing: 3, minWidth: 640, width: "100%" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", fontSize: 12, color: "var(--text-muted)", padding: 6 }}>Student</th>
                {topics.map((t) => (
                  <th key={t} title={t} style={{ fontSize: 11, color: "var(--text-muted)", padding: 6, maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roster.map((r) => (
                <tr key={r.uid}>
                  <td style={{ padding: 4 }}>
                    <div className="flex items-center gap-2">
                      <AvatarDisplay profile={r} size={28} radius={14} />
                      <span className="text-sm font-semibold text-text truncate" style={{ maxWidth: 130 }}>{r.name}</span>
                    </div>
                  </td>
                  {topics.map((t) => {
                    const v = r.topics[t];
                    const acc = v && v.t > 0 ? Math.round((v.c / v.t) * 100) : null;
                    return (
                      <td key={t}>
                        <button
                          onClick={() => openDrill(r, t)}
                          title={`${r.name} · ${t}: ${acc === null ? "no data" : `${acc}% (${v.c}/${v.t})`}`}
                          style={{
                            width: "100%", minWidth: 44, height: 34, borderRadius: 8, border: "none",
                            background: cellColor(acc), color: acc === null ? "var(--text-muted)" : "#fff",
                            fontWeight: 800, fontSize: 12, cursor: "pointer",
                          }}
                        >
                          {acc === null ? "–" : `${acc}`}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="flex gap-4 mt-3 text-xs text-text-muted flex-wrap">
          <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "#16a34a" }} /> ≥80%</span>
          <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "#eab308" }} /> 60–80%</span>
          <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "#f97316" }} /> 40–60%</span>
          <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "#ef4444" }} /> &lt;40%</span>
        </div>
      </section>

      {/* Leaderboard + actions */}
      <div className="grid md:grid-cols-2 gap-4">
        <section className="glass-card p-5">
          <h2 className="font-black text-text mb-3 flex items-center gap-2"><Trophy size={17} className="text-accent" /> Top 10 by XP</h2>
          <div className="space-y-2">
            {leaders.map((l, i) => (
              <div key={l.uid} className="flex items-center gap-3">
                <span className="text-xs font-black text-text-muted w-6">#{i + 1}</span>
                <AvatarDisplay profile={l} size={30} radius={15} />
                <span className="text-sm font-semibold text-text flex-1 truncate">{l.name}</span>
                <span className="text-sm font-bold text-primary">{l.xp.toLocaleString()} XP</span>
              </div>
            ))}
            {leaders.length === 0 && <p className="text-sm text-text-muted">No data yet.</p>}
          </div>
        </section>
        <section className="glass-card p-5 space-y-3">
          <h2 className="font-black text-text">Actions</h2>
          <Link to="/teacher/exam-generator" className="btn-secondary w-full flex items-center gap-2"><FileText size={16} /> Generate exam (PDF)</Link>
          <Link to={classId ? `/teacher/classroom?class=${classId}` : "/teacher/classroom"} className="btn-secondary w-full flex items-center gap-2"><MonitorPlay size={16} /> Open classroom mode</Link>
          <Link to="/room" className="btn-secondary w-full flex items-center gap-2"><MonitorPlay size={16} /> Start live study room</Link>
          <Link to="/teacher/parent-reports" className="btn-secondary w-full flex items-center gap-2"><ClipboardList size={16} /> Parent reports</Link>
        </section>
      </div>

      {/* Drill-down modal */}
      {drill && (
        <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={(e) => { if (e.target === e.currentTarget) setDrill(null); }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
          <div className="glass-card" style={{ position: "relative", width: "100%", maxWidth: 480, padding: 24 }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-text">{drill.student.name} · {drill.topic}</h3>
              <button onClick={() => setDrill(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}><X size={18} /></button>
            </div>
            {(() => {
              const v = drill.student.topics[drill.topic];
              const acc = v && v.t > 0 ? Math.round((v.c / v.t) * 100) : null;
              return (
                <p className="text-sm text-text-muted mb-4">
                  {acc === null ? "No attempts on this topic yet." : `${v.c} correct out of ${v.t} attempts (${acc}%) across recent sessions.`}
                </p>
              );
            })()}
            <label className="text-xs font-bold text-text-muted">TEACHER NOTE (visible to you + admin)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="e.g. Needs vectors revision before Friday" className="input-field mt-2" style={{ resize: "vertical" }} />
            <button onClick={saveNote} disabled={savingNote} className="btn-primary w-full mt-3 disabled:opacity-60">
              <Send size={15} /> {savingNote ? "Saving…" : "Save note"}
            </button>
          </div>
        </div>
      )}

      {schoolId && roster.length > 0 && (
        <TeacherTools schoolId={schoolId} roster={roster} classId={classId} />
      )}
    </div>
  );
}
