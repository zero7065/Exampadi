// Management dashboard — school-scoped oversight for management logins.
// Only sees its own school's data. Can pull sync, message the community,
// and review performance. Independent from admin and from other schools.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { getUserProfile } from "../lib/userProfile";
import { getSchool, listSchoolClasses } from "../lib/schools";
import { syncNow } from "../lib/sync";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { Building2, Users, GraduationCap, BookOpen, RefreshCw, Loader2, MessagesSquare, ShieldCheck, Activity } from "lucide-react";

export default function ManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [school, setSchool] = useState(null);
  const [counts, setCounts] = useState({ students: 0, teachers: 0, classes: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const p = await getUserProfile(user.uid);
        setProfile(p);
        if (p?.schoolId) {
          const [sch, classes, usersSnap] = await Promise.all([
            getSchool(p.schoolId).catch(() => null),
            listSchoolClasses(p.schoolId).catch(() => []),
            getDocs(query(collection(db, "users"), where("schoolId", "==", p.schoolId), limit(500))).catch(() => ({ docs: [] })),
          ]);
          setSchool(sch);
          const users = usersSnap.docs.map((d) => d.data());
          setCounts({
            students: users.filter((u) => u.role === "student" || u.role === "user").length,
            teachers: users.filter((u) => u.role === "teacher").length,
            classes: classes.length,
          });
        }
      } catch (e) {
        console.warn("management load:", e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await syncNow(user.uid, profile);
      toast({ message: res.synced ? "School data synced ✓" : "No new activity to sync — all up to date", type: res.synced ? "success" : "info" });
    } catch (e) {
      toast({ message: e.message, type: "error" });
    } finally {
      setSyncing(false);
    }
  }

  if (loading) return <div className="page-content text-center" style={{ color: "var(--text-muted)" }}><Loader2 className="animate-spin mx-auto" /> Loading school…</div>;

  if (!profile?.schoolId) {
    return (
      <div className="page-content max-w-md mx-auto text-center space-y-3">
        <h1 className="text-xl font-black">Management</h1>
        <p className="text-sm text-text-muted">This account isn't linked to a school. Management logins are created by an admin for a registered school.</p>
        <Link to="/community" className="btn-primary inline-flex">Open community</Link>
      </div>
    );
  }

  return (
    <div className="page-content max-w-5xl mx-auto space-y-5">
      <header className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2"><ShieldCheck size={22} className="text-primary" /> {school?.name || profile.schoolName || "School"} Management</h1>
          <p className="text-sm text-text-muted">School-scoped oversight · {school?.status || "active"} · ID {profile.schoolId?.slice(0, 10)}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSync} disabled={syncing} className="btn-secondary px-4 py-2 text-sm">
            {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Pull sync
          </button>
          <Link to="/community" className="btn-primary px-4 py-2 text-sm"><MessagesSquare size={14} /> Community</Link>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Students", value: counts.students, icon: Users, color: "var(--primary)" },
          { label: "Teachers", value: counts.teachers, icon: GraduationCap, color: "var(--accent)" },
          { label: "Classes", value: counts.classes, icon: BookOpen, color: "#4ADE80" },
          { label: "School", value: school?.status || "—", icon: Building2, color: "#FF9F43" },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4">
            <s.icon size={18} style={{ color: s.color }} />
            <div className="text-2xl font-black mt-1">{s.value}</div>
            <div className="text-xs text-text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="glass-card p-5">
        <h2 className="font-black text-text mb-2 flex items-center gap-1.5"><Activity size={16} className="text-primary" /> School operations</h2>
        <ul className="text-sm text-text-muted space-y-1.5" style={{ lineHeight: 1.6 }}>
          <li>• <strong className="text-text">Pull sync</strong> uploads your school's latest activity to the admin rollup (smart — only when there's new activity).</li>
          <li>• <strong className="text-text">Community</strong> opens your school's private group chat (students + teachers, AI assist).</li>
          <li>• Teachers join with the teacher login code issued to your school; students join with the school/class code.</li>
          <li>• Management logins never see other schools or other admins — fully isolated.</li>
        </ul>
      </div>
    </div>
  );
}