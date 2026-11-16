// Teacher Profile — a dedicated, teacher-only profile (separate from students).
// Shows teaching identity, school/independent status, classes + students,
// subscription status, and an upgrade CTA for teacher Pro (₦3,500/mo).
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSubscription } from "../hooks/useSubscription";
import { useToast } from "../components/Toast";
import { getUserProfile, updateUserProfile } from "../lib/userProfile";
import { listTeacherClasses } from "../lib/schools";
import AvatarDisplay from "../components/Avatar/AvatarDisplay";
import { GraduationCap, Crown, BookOpen, Users, Pencil, Check, Copy, ArrowLeft, Sparkles, Building2 } from "lucide-react";

export default function TeacherProfilePage() {
  const { user } = useAuth();
  const { isPro, daysLeft } = useSubscription();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", bio: "", subjects: "" });

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid).then((p) => {
      setProfile(p);
      setForm({
        name: p?.name || user.displayName || "",
        bio: p?.bio || "",
        subjects: (p?.teacherSubjects || []).join(", "),
      });
    }).catch(() => {});
    listTeacherClasses(user.uid).then(setClasses).catch(() => {});
  }, [user]);

  const studentCount = classes.reduce((sum, c) => sum + (c.students?.length || 0), 0);

  async function save() {
    try {
      const teacherSubjects = form.subjects.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 12);
      await updateUserProfile(user.uid, {
        name: form.name.trim().slice(0, 60),
        bio: form.bio.trim().slice(0, 240),
        teacherSubjects,
      });
      setProfile((p) => ({ ...(p || {}), name: form.name.trim(), bio: form.bio.trim(), teacherSubjects }));
      toast({ message: "Profile updated ✓", type: "success" });
    } catch (e) {
      toast({ message: e.message, type: "error" });
    } finally {
      setEditing(false);
    }
  }

  const isIndependent = profile?.schoolId?.startsWith("personal_") || profile?.independent;
  const schoolName = profile?.schoolName || (isIndependent ? "Independent Teacher" : "");

  return (
    <div className="page-content max-w-3xl mx-auto space-y-5">
      <Link to="/teacher" className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
        <ArrowLeft size={16} /> Teacher dashboard
      </Link>

      {/* Header card */}
      <div className="glass-card p-6" style={{ background: "linear-gradient(150deg, rgb(var(--accent-rgb) / 0.10), var(--bg-2))" }}>
        <div className="flex items-center gap-4 flex-wrap">
          <AvatarDisplay user={user} profile={profile} size={80} radius={22} />
          <div className="flex-1 min-w-0">
            {editing ? (
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" style={{ maxWidth: 260, fontWeight: 700 }} />
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-text">{profile?.name || user?.displayName || "Teacher"}</h1>
                <button onClick={() => setEditing(true)} style={{ color: "var(--text-muted)" }} title="Edit profile"><Pencil size={14} /></button>
              </div>
            )}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest" style={{ background: "rgb(var(--accent-rgb) / 0.2)", color: "var(--accent)" }}>
                <GraduationCap size={10} style={{ display: "inline", marginRight: 3 }} /> Teacher
              </span>
              {profile?.username && <span className="text-xs text-text-muted">@{profile.username}</span>}
              <button
                onClick={() => { navigator.clipboard.writeText(user?.uid || "").then(() => toast({ message: "Teacher ID copied", type: "success" })); }}
                className="text-[10px] px-2 py-0.5 rounded-md inline-flex items-center gap-1"
                style={{ background: "rgb(var(--primary-rgb) / 0.1)", color: "var(--primary)" }}
              >
                <Copy size={9} /> ID {user?.uid?.slice(0, 8)}
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text-muted mt-1">
              <Building2 size={12} /> {schoolName || "—"}
            </div>
          </div>
          <div className="text-right">
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1 ${isPro ? "bg-accent/10 text-accent" : "bg-subtle text-text-muted"}`}>
              {isPro ? <Crown size={11} /> : null} {isPro ? `Teacher Pro${daysLeft ? ` · ${daysLeft}d` : ""}` : "Free"}
            </span>
          </div>
        </div>

        {editing ? (
          <div className="mt-4 space-y-2">
            <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={2} maxLength={240} placeholder="Short bio — what you teach, your approach…" className="input-field" />
            <input value={form.subjects} onChange={(e) => setForm({ ...form, subjects: e.target.value })} placeholder="Subjects you teach (comma separated)" className="input-field" />
            <div className="flex gap-2">
              <button onClick={save} className="btn-primary text-sm px-4 py-2"><Check size={14} style={{ display: "inline", marginRight: 4 }} />Save</button>
              <button onClick={() => setEditing(false)} className="btn-secondary text-sm px-4 py-2">Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm mt-3" style={{ color: profile?.bio ? "var(--text)" : "var(--text-muted)", fontStyle: profile?.bio ? "normal" : "italic" }}>
              {profile?.bio || "No bio yet — tell students what you teach."}
            </p>
            {(profile?.teacherSubjects?.length > 0) && (
              <div className="flex gap-1.5 flex-wrap mt-2">
                {profile.teacherSubjects.map((s) => (
                  <span key={s} className="text-xs px-2 py-0.5 rounded-md" style={{ background: "var(--bg-3)", color: "var(--text-muted)" }}>{s}</span>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { icon: BookOpen, label: "Classes", value: classes.length, color: "var(--primary)" },
          { icon: Users, label: "Students", value: studentCount, color: "#4ADE80" },
          { icon: GraduationCap, label: "Status", value: isPro ? "Pro" : "Free", color: "var(--accent)" },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4">
            <s.icon size={18} style={{ color: s.color }} />
            <div className="text-2xl font-black mt-1">{s.value}</div>
            <div className="text-xs text-text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Teacher Pro upsell (same ₦3,500/month as student Pro) */}
      {!isPro ? (
        <div className="glass-card p-5" style={{ borderColor: "rgb(var(--accent-rgb) / 0.4)", background: "linear-gradient(135deg, rgb(var(--accent-rgb) / 0.10), var(--bg-2))" }}>
          <div className="flex items-center gap-2 mb-1">
            <Crown size={18} className="text-accent" />
            <h2 className="font-black text-text">Unlock Teacher Pro</h2>
          </div>
          <p className="text-sm text-text-muted mb-3" style={{ lineHeight: 1.6 }}>
            ₦3,500/month unlocks AI lesson plans, PDF exam generation, classroom live mode, parent reports and unlimited assignments — everything a school teacher needs.
          </p>
          <Link to="/payment" className="btn-primary inline-flex items-center gap-2"><Sparkles size={15} /> Upgrade for ₦3,500/mo</Link>
        </div>
      ) : (
        <div className="glass-card p-4 text-sm" style={{ borderColor: "rgba(74,222,128,0.4)" }}>
          <strong style={{ color: "var(--success)" }}>Teacher Pro active</strong> — all teacher tools are unlocked. {daysLeft ? `Renews in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.` : ""}
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-2">
        <Link to="/teacher" className="btn-secondary text-sm py-3 text-center">Dashboard</Link>
        <Link to="/teacher/classroom" className="btn-secondary text-sm py-3 text-center">Classroom</Link>
        <Link to="/teacher/reviews" className="btn-secondary text-sm py-3 text-center">Reviews</Link>
      </div>
    </div>
  );
}