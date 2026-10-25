// Teacher dashboard: class selector, heatmap, leaderboard, weak topics,
// class creation + invites, drill-down with teacher notes.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import { getUserProfile } from "../../lib/userProfile";
import {
  listSchoolClasses, createClass, createClassInvite, getClass, updateClassSettings,
  saveTeacherNote, getTeacherNote, createLessonPlan, listLessonPlans, deleteLessonPlan,
} from "../../lib/schools";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import AvatarDisplay from "../../components/Avatar/AvatarDisplay";
import {
  Users, Plus, FileText, MonitorPlay, ClipboardList, X, Send, Trophy, BookOpenCheck, Inbox, Settings2,
} from "lucide-react";
import { createAssignment } from "../../lib/teacherContent";
import { getQuestionsFromBank } from "../../data/questions/compat";
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
  const [lessons, setLessons] = useState([]);
  const [showLesson, setShowLesson] = useState(false);
  const [newLesson, setNewLesson] = useState({ title: "", topic: "", week: "", objectives: "", activities: "" });
  const [showAssign, setShowAssign] = useState(false);
  const [newAssign, setNewAssign] = useState({ title: "", subject: "", count: 10, dueDate: "" });
  const [creatingAssign, setCreatingAssign] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [classCfg, setClassCfg] = useState({
    questionSeconds: 0, allowChat: true, showLeaderboard: true,
    instructions: "", goal: "", lateJoin: true,
  });

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

  useEffect(() => {
    if (!classId) return;
    getClass(classId).then((c) => {
      setClassCfg({
        questionSeconds: Number(c?.config?.questionSeconds) || 0,
        allowChat: c?.config?.allowChat !== false,
        showLeaderboard: c?.config?.showLeaderboard !== false,
        instructions: c?.config?.instructions || "",
        goal: c?.config?.goal || "",
        lateJoin: c?.config?.lateJoin !== false,
      });
    }).catch(() => {});
  }, [classId]);

  useEffect(() => {
    if (!classId) { setLessons([]); return; }
    listLessonPlans({ classId }).then(setLessons).catch(() => setLessons([]));
  }, [classId]);

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
      const id = await createClass(schoolId, {
        name: newClass.name.trim(),
        subject: newClass.subject.trim(),
        createdBy: user.uid,
        teacherId: user.uid,
        teacherName: profile?.name || user.displayName || "Teacher",
      });
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

  async function saveClassSettings(e) {
    e.preventDefault();
    if (!classId) return;
    setSavingSettings(true);
    try {
      await updateClassSettings(classId, { config: classCfg });
      setClasses((cs) => cs.map((c) => (c.id === classId ? { ...c, config: classCfg } : c)));
      toast({ message: "Class settings saved", type: "success" });
      setShowSettings(false);
    } catch (err) {
      toast({ message: err.message || "Could not save settings", type: "error" });
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleInvite() {
    if (!classId) return;
    try {
      const code = await createClassInvite({
        classId, schoolId, createdBy: user.uid,
        teacherName: profile?.name || user.displayName || "Teacher",
      });
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

  async function handleCreateLesson(e) {
    e.preventDefault();
    if (!classId || !newLesson.title.trim()) {
      toast({ message: "Pick a class and add a lesson title", type: "warning" });
      return;
    }
    try {
      await createLessonPlan({
        schoolId,
        classId,
        teacherId: user.uid,
        teacherName: profile?.name || user.displayName || "Teacher",
        title: newLesson.title.trim(),
        subject: classes.find((c) => c.id === classId)?.subject || "",
        topic: newLesson.topic.trim(),
        week: newLesson.week.trim(),
        objectives: newLesson.objectives,
        activities: newLesson.activities,
      });
      setNewLesson({ title: "", topic: "", week: "", objectives: "", activities: "" });
      setShowLesson(false);
      setLessons(await listLessonPlans({ classId }));
      toast({ message: "Lesson plan published ✓", type: "success" });
    } catch (err) {
      toast({ message: `Failed: ${err.message}`, type: "error" });
    }
  }

  async function handleCreateAssignment(e) {
    e.preventDefault();
    if (!classId || !newAssign.title.trim()) {
      toast({ message: "Pick a class and add an assignment title", type: "warning" });
      return;
    }
    const cls = classes.find((c) => c.id === classId);
    const subject = newAssign.subject.trim() || cls?.subject || "Mathematics";
    const count = Math.max(1, Math.min(40, Number(newAssign.count) || 10));
    const questions = getQuestionsFromBank({ subject, count });
    if (!questions.length) {
      toast({ message: `No questions found for ${subject}`, type: "warning" });
      return;
    }
    setCreatingAssign(true);
    try {
      await createAssignment({
        teacherId: user.uid,
        teacherName: profile?.name || user.displayName || "Teacher",
        title: newAssign.title.trim(),
        questions,
        studentIds: roster.map((s) => s.uid),
        dueDate: newAssign.dueDate || null,
        subject,
        classId,
        schoolId,
      });
      toast({ message: "Assignment sent to the class ✓", type: "success" });
      setNewAssign({ title: "", subject: "", count: 10, dueDate: "" });
      setShowAssign(false);
    } catch (err) {
      toast({ message: `Failed: ${err.message}`, type: "error" });
    } finally {
      setCreatingAssign(false);
    }
  }

  async function handleDeleteLesson(id) {
    try {
      await deleteLessonPlan(id);
      setLessons((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      toast({ message: `Delete failed: ${err.message}`, type: "error" });
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
          <button onClick={() => setShowSettings(true)} disabled={!classId} className="btn-secondary px-4 text-sm disabled:opacity-50"><Settings2 size={15} /> Settings</button>
          <button onClick={handleInvite} className="btn-secondary px-4 text-sm"><Users size={15} /> Invite code</button>
          <button onClick={() => setShowAssign((v) => !v)} className="btn-secondary px-4 text-sm flex items-center gap-1.5"><ClipboardList size={15} /> Assignment</button>
          <Link to="/teacher/reviews" className="btn-secondary px-4 text-sm flex items-center gap-1.5"><Inbox size={15} /> Reviews</Link>
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

      {showSettings && (
        <form onSubmit={saveClassSettings} className="glass-card p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-black text-text flex items-center gap-2"><Settings2 size={17} className="text-primary" /> Class defaults</h2>
            <button type="button" onClick={() => setShowSettings(false)} className="text-text-muted"><X size={17} /></button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs font-bold text-text-muted">
              Goal for this class
              <input value={classCfg.goal} onChange={(e) => setClassCfg({ ...classCfg, goal: e.target.value })} maxLength={160} placeholder="e.g. Finish Mechanics before midterm" className="input-field mt-1" />
            </label>
            <label className="text-xs font-bold text-text-muted">
              Default seconds per question
              <input type="number" min="0" max="900" value={classCfg.questionSeconds} onChange={(e) => setClassCfg({ ...classCfg, questionSeconds: Number(e.target.value) || 0 })} className="input-field mt-1" />
            </label>
          </div>
          <label className="block text-xs font-bold text-text-muted">
            Default class instructions
            <textarea value={classCfg.instructions} onChange={(e) => setClassCfg({ ...classCfg, instructions: e.target.value })} maxLength={500} rows={3} className="input-field mt-1 resize-none" />
          </label>
          <div className="flex flex-wrap gap-4 text-xs font-bold text-text-muted">
            <label className="flex items-center gap-2"><input type="checkbox" checked={classCfg.allowChat} onChange={(e) => setClassCfg({ ...classCfg, allowChat: e.target.checked })} /> Allow class chat</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={classCfg.showLeaderboard} onChange={(e) => setClassCfg({ ...classCfg, showLeaderboard: e.target.checked })} /> Show leaderboard</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={classCfg.lateJoin} onChange={(e) => setClassCfg({ ...classCfg, lateJoin: e.target.checked })} /> Allow late join</label>
          </div>
          <button type="submit" disabled={savingSettings} className="btn-primary px-5 disabled:opacity-60">{savingSettings ? "Saving…" : "Save class settings"}</button>
        </form>
      )}

      {showAssign && (
        <form onSubmit={handleCreateAssignment} className="glass-card p-5 grid sm:grid-cols-2 gap-3">
          <input value={newAssign.title} onChange={(e) => setNewAssign({ ...newAssign, title: e.target.value })} placeholder="Assignment title" className="input-field sm:col-span-2" />
          <input value={newAssign.subject} onChange={(e) => setNewAssign({ ...newAssign, subject: e.target.value })} placeholder={`Subject (default: ${classes.find((c) => c.id === classId)?.subject || "class subject"})`} className="input-field" />
          <input type="number" min="1" max="40" value={newAssign.count} onChange={(e) => setNewAssign({ ...newAssign, count: e.target.value })} placeholder="Questions" className="input-field" />
          <input type="date" value={newAssign.dueDate} onChange={(e) => setNewAssign({ ...newAssign, dueDate: e.target.value })} className="input-field" />
          <div className="flex gap-2">
            <button type="submit" disabled={creatingAssign} className="btn-primary px-5" style={{ opacity: creatingAssign ? 0.6 : 1 }}>
              {creatingAssign ? "Sending…" : `Send to ${roster.length} students`}
            </button>
            <button type="button" onClick={() => setShowAssign(false)} className="btn-secondary px-5">Cancel</button>
          </div>
        </form>
      )}

      {/* Lesson plans / scheme of work */}
      <section className="glass-card p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <h2 className="font-black text-text flex items-center gap-2"><BookOpenCheck size={17} className="text-primary" /> Lesson plans</h2>
          <button onClick={() => setShowLesson((v) => !v)} className="btn-secondary px-4 text-sm"><Plus size={15} /> Lesson</button>
        </div>
        {showLesson && (
          <form onSubmit={handleCreateLesson} className="grid sm:grid-cols-2 gap-2 mb-4">
            <input value={newLesson.title} onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })} placeholder="Lesson title" className="input-field" />
            <input value={newLesson.week} onChange={(e) => setNewLesson({ ...newLesson, week: e.target.value })} placeholder="Week (e.g. Week 3)" className="input-field" />
            <input value={newLesson.topic} onChange={(e) => setNewLesson({ ...newLesson, topic: e.target.value })} placeholder="Topic" className="input-field" />
            <input value={newLesson.objectives} onChange={(e) => setNewLesson({ ...newLesson, objectives: e.target.value })} placeholder="Objectives (comma separated)" className="input-field" />
            <textarea value={newLesson.activities} onChange={(e) => setNewLesson({ ...newLesson, activities: e.target.value })} placeholder="Class activities / homework" rows={2} className="input-field sm:col-span-2" />
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" className="btn-primary px-5">Publish lesson</button>
              <button type="button" onClick={() => setShowLesson(false)} className="btn-secondary px-5">Cancel</button>
            </div>
          </form>
        )}
        {lessons.length === 0 ? (
          <p className="text-sm text-text-muted">No lesson plans yet. Publish one and it appears for every student in this class.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lessons.map((l) => (
              <div key={l.id} className="rounded-2xl border border-border p-4" style={{ background: "var(--bg-3)" }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-text">{l.title}</p>
                    <p className="text-xs text-text-muted">{l.week || "No week"} · {l.topic || l.subject || "General"}</p>
                  </div>
                  <button onClick={() => handleDeleteLesson(l.id)} title="Delete lesson" style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}><X size={14} /></button>
                </div>
                {l.objectives && <p className="text-xs text-text-muted mt-2 line-clamp-3">{l.objectives}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

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
