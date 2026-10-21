import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useAuth } from "../context/AuthContext";
import { Hash, BookText, Atom, Sparkles, TrendingUp, Target, Clock } from "lucide-react";

const SUBJECT_ICONS = {
  English: BookText, Maths: Hash, Physics: Atom, Chemistry: Atom,
  Biology: Atom, Economics: Hash, Government: BookText, Literature: BookText,
  CRS: BookText, Geography: Atom, Commerce: Hash, Accounting: Hash,
  "Further Maths": Hash, "Agricultural Science": Atom, "Technical Drawing": Hash,
  "Business Management": Hash,
};

const statusConfig = (progress) => {
  if (progress >= 80) return { color: "var(--success)", label: "Mastered" };
  if (progress >= 50) return { color: "#d4a040", label: "Proficient" };
  return { color: "var(--danger)", label: "Needs Work" };
};

export default function MasteryPage() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    async function fetchMastery() {
      try {
        const sessionsRef = collection(db, "sessions");
        const q = query(sessionsRef, where("userId", "==", user.uid));
        const snapshot = await getDocs(q);

        const subjectMap = {};
        snapshot.docs.forEach(doc => {
          const s = doc.data();
          const subj = s.subject;
          if (!subj) return;
          if (!subjectMap[subj]) {
            subjectMap[subj] = { total: 0, correct: 0, sessions: 0, lastSession: null };
          }
          subjectMap[subj].total += s.total || 0;
          subjectMap[subj].correct += s.correct || 0;
          subjectMap[subj].sessions += 1;
          const ts = s.completedAt?.toDate?.();
          if (ts && (!subjectMap[subj].lastSession || ts > subjectMap[subj].lastSession)) {
            subjectMap[subj].lastSession = ts;
          }
        });

        const result = Object.entries(subjectMap).map(([name, data]) => {
          const mastery = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
          const Icon = SUBJECT_ICONS[name] || Atom;
          const lastAgo = data.lastSession ? getTimeAgo(data.lastSession) : "never";
          return { name, Icon, mastery, sessions: data.sessions, total: data.total, correct: data.correct, lastAgo };
        });

        result.sort((a, b) => b.mastery - a.mastery);
        setSubjects(result);
      } catch (e) {
        console.error("Failed to load mastery:", e);
      } finally {
        setLoading(false);
      }
    }

    fetchMastery();
  }, [user]);

  function getTimeAgo(date) {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  if (loading) {
    return (
      <div className="page-content flex items-center justify-center" style={{ minHeight: "60vh" }}>
        <div className="w-8 h-8 rounded-full border-3 border-border border-t-primary animate-spin" />
      </div>
    );
  }

  const weakest = subjects.filter(s => s.mastery < 50).slice(0, 3);

  return (
    <div className="page-content space-y-8">
      <header className="animate-fade">
        <h1 className="text-3xl font-black tracking-tight">Topic Mastery</h1>
        <p className="text-text-muted mt-1">Your progress across all subjects</p>
      </header>

      {subjects.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Target size={48} className="mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
          <h3 className="text-lg font-bold text-text mb-2">No data yet</h3>
          <p className="text-text-muted text-sm mb-4">Complete practice sessions to see your mastery levels</p>
          <Link to="/select" className="btn-primary inline-flex">Start Practicing</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((s, si) => {
            const OverallIcon = s.mastery >= 70 ? Sparkles : s.mastery >= 50 ? TrendingUp : Target;
            return (
              <div
                key={s.name}
                className="glass-card p-5 space-y-4 animate-slide-up"
                style={{ animationDelay: `${si * 0.1}s` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--primary-dim)" }}>
                      <s.Icon size={20} style={{ color: "var(--primary)" }} />
                    </div>
                    <div>
                      <h3 className="font-bold" style={{ color: "var(--text)" }}>{s.name}</h3>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.sessions} sessions · {s.total} questions</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <OverallIcon size={16} style={{ color: "var(--primary)" }} />
                    <span className="font-black text-lg" style={{ color: "var(--primary)" }}>{s.mastery}%</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium" style={{ color: "var(--text)" }}>Accuracy</span>
                    <span className="text-xs font-semibold" style={{ color: statusConfig(s.mastery).color }}>{statusConfig(s.mastery).label}</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-3)" }}>
                    <div
                      className="h-full rounded-full animate-scale-in"
                      style={{
                        width: `${s.mastery}%`,
                        background: statusConfig(s.mastery).color,
                        animationDelay: `${0.3 + si * 0.1}s`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Clock size={14} style={{ color: "var(--text-muted)" }} />
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>Last studied {s.lastAgo}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {weakest.length > 0 && (
        <div className="glass-card p-6 text-center space-y-4" style={{
          background: "linear-gradient(135deg, var(--primary), #047857)",
          border: "none"
        }}>
          <Sparkles size={32} className="mx-auto" style={{ color: "var(--text)" }} />
          <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>Focus Areas</h2>
          <p className="text-sm max-w-lg mx-auto" style={{ color: "var(--text-muted)" }}>
            Based on your accuracy, focus on{" "}
            {weakest.map((w, i) => (
              <span key={w.name}>
                <strong style={{ color: "var(--text)" }}>{w.name}</strong>
                {i < weakest.length - 2 ? ", " : i === weakest.length - 2 ? " and " : ""}
              </span>
            ))}{" "}
            this week.
          </p>
          <Link to="/study-plan" className="inline-flex items-center gap-2 font-bold px-8 py-3 rounded-xl shadow-lg" style={{
            background: "var(--text)",
            color: "var(--primary)",
            transition: "all 0.2s ease"
          }}>
            View Study Plan
          </Link>
        </div>
      )}
    </div>
  );
}
