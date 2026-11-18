import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { getUserProfile } from "../lib/userProfile";
import { useSubscription } from "../hooks/useSubscription";
import { checkQuestionLimit, checkAILimit } from "../lib/usageTracker";
import { getQuestionsFromBank } from "../data/questions/compat";
import { getStudentMemory } from "../lib/aiMemory";
import { analyzeLearning } from "../lib/learningLoop";
import { dailyHealthTip } from "../data/wellness";
import { isAdmin } from "../lib/activityLog";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "../firebaseConfig";
import ProUpgradeModal from "../components/ProUpgradeModal";
import ResumeBanner from "../components/ResumeBanner";
import NotificationPrompt from "../components/NotificationPrompt";
import OnboardingTour from "../components/OnboardingTour";
import { tourSeen } from "../lib/tour";
import SurveyPrompt from "../components/SurveyPrompt";
import { subscribeUpdates } from "../lib/community";
import {
  Zap, Send, ChevronRight, Crown, Megaphone
} from "lucide-react";

const SUBJECT_ICONS = {
  English: "📖", Maths: "🔢", Physics: "⚛️", Chemistry: "🧪", Biology: "🧬",
  Economics: "💰", Government: "🏛️", Literature: "📚", CRS: "✝️", Geography: "🌍",
  Commerce: "📊", Accounting: "🧾", "Further Maths": "📐", "Agricultural Science": "🌾", "Technical Drawing": "📏",
  "Business Management": "💼",
};

// Pure relative-time formatter (caller supplies `now` so it stays out of render).
function relTime(ts, now) {
  const d = ts?.toDate ? ts.toDate() : ts?.seconds ? new Date(ts.seconds * 1000) : ts ? new Date(ts) : null;
  if (!d || isNaN(d.getTime())) return "";
  const diff = Math.floor((now - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isPro } = useSubscription();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showProModal, setShowProModal] = useState(false);
  const [questionsLeft, setQuestionsLeft] = useState({ used: 0, limit: 15 });
  const [aiCredits, setAiCredits] = useState(null);
  const [subjectStats, setSubjectStats] = useState({});
  const [insights, setInsights] = useState([]);
  const [showTour, setShowTour] = useState(() => !tourSeen());
  const [updates, setUpdates] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const healthTip = dailyHealthTip(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    const unsub = subscribeUpdates(setUpdates, 5);
    return () => unsub && unsub();
  }, []);

  // NOTE: admins intentionally land here like everyone else.
  // The admin console is reachable via the Admin nav item / /admin route.

  useEffect(() => {
    async function fetchProfile() {
      if (user) {
        try {
          const data = await getUserProfile(user.uid);
          setProfile(data);
          const ql = await checkQuestionLimit(user.uid);
          setQuestionsLeft(ql);
          checkAILimit(user.uid).then(l => setAiCredits(l)).catch(() => {});

          const sessionsRef = collection(db, "sessions");
          const q = query(sessionsRef, where("userId", "==", user.uid), limit(50));
          const snap = await getDocs(q);
          const docs = [...snap.docs].sort(
            (a, b) => (b.data().completedAt?.seconds || 0) - (a.data().completedAt?.seconds || 0)
          );
          const stats = {};
          docs.forEach(d => {
            const s = d.data();
            const subj = s.subject;
            if (subj) {
              if (!stats[subj]) stats[subj] = { done: 0, correct: 0 };
              stats[subj].done += s.total || 0;
              stats[subj].correct += s.correct || 0;
            }
          });
          setSubjectStats(stats);

          // Recent activity feed — prefer the user's own activity log (rules allow
          // read where userId == auth.uid); fall back to saved sessions.
          try {
            const actSnap = await getDocs(query(collection(db, "activityLog"), where("userId", "==", user.uid), limit(25)));
            const acts = actSnap.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0))
              .slice(0, 6);
            if (acts.length) {
              setRecentActivity(acts.map((a) => ({ ...a, ago: relTime(a.timestamp, Date.now()) })));
            } else {
              setRecentActivity(docs.slice(0, 6).map((d) => {
                const s = d.data();
                return { id: d.id, action: "session_complete", details: { subject: s.subject, score: s.score }, timestamp: s.completedAt, ago: relTime(s.completedAt, Date.now()) };
              }));
            }
          } catch { /* feed is optional */ }
          // AI learning loop: spot failure patterns + prescribe countermeasures
          try {
            const mem = await getStudentMemory(user.uid).catch(() => null);
            const sessionData = docs.map((d) => ({ ...d.data(), id: d.id }));
            let seen = {};
            try { seen = JSON.parse(localStorage.getItem(`rx-seen-${user.uid}`) || "{}"); } catch { /* ignore */ }
            const found = analyzeLearning({ sessions: sessionData, memory: mem, seenCounts: seen });
            setInsights(found.slice(0, 2));
            // record views so countermeasures escalate while a problem persists
            const next = { ...seen };
            found.forEach(({ pattern }) => {
              const k = `${pattern.subject}::${pattern.topic}::${pattern.kind}`;
              next[k] = (next[k] || 0) + 1;
            });
            try { localStorage.setItem(`rx-seen-${user.uid}`, JSON.stringify(next)); } catch { /* ignore */ }
          } catch (e) {
            console.warn("Learning loop failed:", e?.message);
          }
        } catch (e) {
          console.error(e);
          toast({ message: "Failed to load profile data. Please refresh.", type: "error" });
        }
      }
      setLoading(false);
    }
    fetchProfile();
  }, [user, toast]);

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }

  function activityMeta(action, details = {}) {
    switch (action) {
      case "register": return { icon: "🎉", text: "Joined ExamPadi" };
      case "login": return { icon: "🔑", text: "Logged in" };
      case "onboarding_complete": return { icon: "🎯", text: `Set up ${details.exam || "their"} prep` };
      case "practice_start": return { icon: "▶️", text: `Started ${details.subject || "a practice session"}` };
      case "session_complete": return { icon: "✅", text: `Completed ${details.subject || "a"} session${details.score != null ? ` · ${details.score}%` : ""}` };
      case "high_score": return { icon: "🏆", text: `High score${details.subject ? ` in ${details.subject}` : ""}${details.score != null ? ` · ${details.score}%` : ""}` };
      case "streak": return { icon: "🔥", text: `${details.days || ""}-day streak` };
      case "mock_exam_complete": return { icon: "📝", text: `Mock exam complete${details.overallScore != null ? ` · ${details.overallScore}%` : ""}` };
      case "ai_chat": return { icon: "🤖", text: `Asked the AI Tutor${details.subject ? ` about ${details.subject}` : ""}` };
      case "ai_image_request": return { icon: "🖼️", text: "Generated an AI image" };
      case "flashcard_review": return { icon: "🃏", text: "Reviewed flashcards" };
      case "study_plan_update": return { icon: "🗓️", text: "Updated the study plan" };
      case "notepad_save": return { icon: "🗒️", text: "Saved a note" };
      case "chess_result": return { icon: "♟️", text: "Played a chess match" };
      case "trivia_played": return { icon: "🧠", text: "Played trivia" };
      case "study_partner_connect": return { icon: "🤝", text: "Connected with a study partner" };
      case "profile_update": return { icon: "👤", text: "Updated profile" };
      case "settings_change": return { icon: "⚙️", text: "Changed settings" };
      case "payment_success": return { icon: "💳", text: `Upgraded${details.plan ? ` to ${details.plan}` : " to Pro"}` };
      default: return { icon: "•", text: action };
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
        Loading...
      </div>
    );
  }

  const subjects = profile?.subjects || [];
  const streak = profile?.streak || 0;
  const xp = profile?.xp || 0;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "'Inter', system-ui, sans-serif", color: "var(--text)" }}>
      <div className="page-content" style={{ maxWidth: 1200, margin: "0 auto" }}>
        <ResumeBanner />
        <NotificationPrompt />

{updates.length > 0 && (
            <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Megaphone size={14} color="var(--primary)" />
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: 1 }}>Latest Updates</span>
              </div>
              {updates.slice(0, 3).map((u) => (
                <div key={u.id} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{u.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{u.body?.slice(0, 100)}…</div>
                </div>
              ))}
            </div>
)}

          {/* Pro Banner (free users only) */}
          {!isPro && (
            <div style={{
              background: "linear-gradient(90deg, #1a0a3a, #0d1a3a)", borderRadius: 16,
              padding: "14px 16px", marginBottom: 24, display: "flex", alignItems: "center",
              justifyContent: "space-between", border: "1px solid #2a1a4a", position: "relative",
              overflow: "hidden", flexWrap: "wrap", gap: 12,
            }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: "var(--accent)" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Crown size={20} color="var(--accent)" />
                <div>
                  <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>
                    🚀 You're on the Free plan
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Unlock everything with Pro</div>
                </div>
              </div>
              <button
                onClick={() => setShowProModal(true)}
                style={{
                  background: "transparent", border: "1px solid var(--accent)", color: "var(--accent)",
                  padding: "8px 16px", borderRadius: 10, fontWeight: 700, fontSize: 13,
                  cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                }}
              >
                Upgrade Now →
              </button>
            </div>
          )}

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: "clamp(20px, 4vw, 24px)", fontWeight: 700, color: "var(--text)", margin: 0 }}>
              {getGreeting()}, {user?.displayName?.split(" ")[0] || "Student"} 👋
            </h1>
          </div>
            <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", padding: "8px 16px", borderRadius: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <span>🔥</span> <span style={{ fontWeight: 600 }}>{streak} day streak</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", padding: "8px 16px", borderRadius: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <Zap size={16} color="var(--accent)" /> <span style={{ fontWeight: 600 }}>{xp} XP</span>
            </div>
            {!isPro && (
              <div style={{
                background: "rgba(255,77,106,0.08)", border: "1px solid rgba(255,77,106,0.2)",
                padding: "8px 16px", borderRadius: 20, display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
              }}
              onClick={() => setShowProModal(true)}>
                <div style={{ fontSize: 13, color: "#FF6B6B", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>{questionsLeft.limit - questionsLeft.used} questions left</span>
                </div>
              </div>
            )}
            {!isPro && aiCredits?.available != null && (
              <div
                onClick={() => navigate("/ai-tutor")}
                style={{
                  background: "rgb(var(--primary-rgb) / 0.08)", border: "1px solid rgb(var(--primary-rgb) / 0.35)",
                  padding: "8px 16px", borderRadius: 20, display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
                }}>
                <div style={{ fontSize: 13, color: "var(--primary)", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>{aiCredits.available} AI messages left</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Admin shortcut — visible only to admins, no forced redirect */}
        {isAdmin(user) && (
          <div
            onClick={() => navigate("/admin")}
            style={{
              display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
              background: "rgb(var(--accent-rgb) / 0.08)", border: "1px solid rgb(var(--accent-rgb) / 0.35)",
              padding: "12px 18px", borderRadius: 14, marginBottom: 28,
            }}
          >
            <span style={{ fontSize: 20 }}>👑</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: "var(--accent)", fontSize: 14 }}>Admin Console</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Manage users, schools, content and compliance →</div>
            </div>
          </div>
        )}

        {/* AI Coach: pattern detection + countermeasures */}
        {insights.length > 0 && (
          <div style={{ marginBottom: 28, display: "grid", gap: 12 }}>
            {insights.map(({ pattern, rx }, i) => (
              <div key={i} style={{
                display: "flex", gap: 12, alignItems: "flex-start",
                background: pattern.severity === "high" ? "rgba(255,77,106,0.07)" : "rgb(var(--accent-rgb) / 0.07)",
                border: pattern.severity === "high" ? "1px solid rgba(255,77,106,0.3)" : "1px solid rgb(var(--accent-rgb) / 0.3)",
                padding: "14px 16px", borderRadius: 14, flexWrap: "wrap",
              }}>
                <span style={{ fontSize: 22 }}>🤖</span>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{rx.title}</div>
                  <div style={{ fontSize: 13, color: "#aaa", marginTop: 2, lineHeight: 1.5 }}>{rx.body}</div>
                </div>
                <button onClick={() => navigate(rx.action.to)} style={{
                  background: "var(--primary)", color: "#fff", border: "none",
                  padding: "10px 18px", borderRadius: 10, fontWeight: 700, fontSize: 13,
                  cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                }}>
                  {rx.action.label}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Health tip of the day */}
        {healthTip && (
          <div style={{
            display: "flex", gap: 12, alignItems: "center",
            background: "rgba(0,229,160,0.06)", border: "1px solid rgba(0,229,160,0.25)",
            padding: "12px 16px", borderRadius: 14, marginBottom: 28,
          }}>
            <span style={{ fontSize: 24 }}>{healthTip.icon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Study healthy: {healthTip.title}</div>
              <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{healthTip.body}</div>
            </div>
          </div>
        )}

        {/* Subject Cards */}
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Your Subjects</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20, marginBottom: 40 }}>
          {subjects.length === 0 ? (
             <p style={{ color: "var(--text-muted)" }}>No subjects selected. Go to settings to update.</p>
          ) : (
            subjects.map((subj) => (
              <div key={subj} style={{
                background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 16, padding: 20,
                transition: "all 0.2s", cursor: "pointer",
                borderLeft: "4px solid var(--primary)"
              }}
              onClick={() => {
  const qs = getQuestionsFromBank({ subject: subj, count: 10, exam: profile?.exam || "JAMB" });
  navigate("/practice", { state: { questions: qs, subject: subj, mode: "practice" } });
}}
              onMouseOver={(e) => {
                e.currentTarget.style.boxShadow = "0 8px 32px rgb(var(--primary-rgb) / 0.15)";
                e.currentTarget.style.borderColor = "var(--primary)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.borderColor = "var(--border)";
              }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 24 }}>{SUBJECT_ICONS[subj] || "📚"}</span>
                    <span style={{ fontWeight: 600, fontSize: 16 }}>{subj}</span>
                  </div>
                </div>
                <div style={{ height: 6, background: "var(--border)", borderRadius: 3, marginBottom: 12, overflow: "hidden" }}>
                  <div style={{
                    width: subjectStats[subj] ? `${Math.min(100, Math.round((subjectStats[subj].correct / Math.max(subjectStats[subj].done, 1)) * 100))}%` : "0%",
                    height: "100%", background: "var(--primary)", borderRadius: 3
                  }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "var(--text-muted)" }}>
                  <span>{subjectStats[subj]?.done || 0} questions done</span>
                  <button style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                    Start <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Daily Challenge */}
        <div
          onClick={() => navigate("/practice-select")}
          style={{
            background: "linear-gradient(135deg, #1a0a3a 0%, #0d1a3a 100%)",
            borderRadius: 16, padding: "20px 16px", marginBottom: 40, display: "flex", alignItems: "center", justifyContent: "space-between",
            border: "1px solid #333", position: "relative", overflow: "hidden", cursor: "pointer", flexWrap: "wrap", gap: 12
          }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: "var(--accent)" }} />
          <div>
            <div style={{ color: "var(--accent)", fontWeight: 700, fontSize: 14, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
              <Zap size={16} /> DAILY CHALLENGE
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#fff", marginBottom: 4 }}>10 mixed questions</div>
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>15 mins · 2x XP today</div>
          </div>
          <button style={{
            background: "transparent", border: "1px solid var(--accent)", color: "var(--accent)", padding: "10px 20px", borderRadius: 10, fontWeight: 600, cursor: "pointer"
          }}>
            Start Challenge →
          </button>
        </div>

        {/* Streak & achievements (persisted on the user profile) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
          <div style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.12), rgba(239,68,68,0.05))", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 16, padding: 18, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 30 }}>🔥</span>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>{streak} day{streak === 1 ? "" : "s"}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Current streak — practice daily to keep it alive</div>
            </div>
          </div>
          <div style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.05))", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 16, padding: 18, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
            onClick={() => navigate("/progress")}>
            <span style={{ fontSize: 30 }}>🏅</span>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>{(profile?.achievements || []).length} badge{(profile?.achievements || []).length === 1 ? "" : "s"}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Achievements unlocked — tap to view all</div>
            </div>
          </div>
        </div>

        {/* School Community + Games banner */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 40 }}>
          <div
            onClick={() => navigate("/community")}
            style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.06))", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 16, padding: 18, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
          >
            <div style={{ fontSize: 26 }}>👥</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>School Community</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Chat with your school · AI assist</div>
            </div>
            <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
          </div>
          <div
            onClick={() => navigate("/games")}
            style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(239,68,68,0.06))", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 16, padding: 18, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
          >
            <div style={{ fontSize: 26 }}>♟️</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>Games & Chess</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>10 levels · brain teasers · challenges</div>
            </div>
            <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
          </div>
        </div>

        {/* AI Tutor & Recent Activity */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          <div
            onClick={() => navigate("/ai-tutor")}
            style={{ background: "var(--bg-2)", border: "1px solid var(--primary)", borderRadius: 16, padding: 24, cursor: "pointer" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Ask AI Tutor</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>Get instant explanations for any topic or question</p>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="text" placeholder="Ask anything... e.g. Explain Newton's 3rd law" readOnly style={{
                flex: 1, background: "#0a0a0f", border: "1px solid #333", borderRadius: 8, padding: "10px 12px", color: "#fff", outline: "none", fontSize: 13
              }} />
              <button style={{ background: "var(--primary)", border: "none", borderRadius: 8, padding: "0 16px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center" }}>
                <Send size={16} />
              </button>
            </div>
          </div>

          <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 16, padding: 24 }}>
             <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>Recent Activity</h3>
             {recentActivity.length === 0 ? (
               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "12px 0" }}>
                 <div style={{ fontSize: 32, marginBottom: 8 }}>🚀</div>
                 <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>No activity yet — start your first practice session!</p>
               </div>
             ) : (
               <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                 {recentActivity.map((a) => {
                   const m = activityMeta(a.action, a.details);
                   return (
                     <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                       <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>{m.icon}</span>
                       <span style={{ flex: 1, fontSize: 13, color: "var(--text)" }}>{m.text}</span>
                       <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{a.ago}</span>
                     </div>
                   );
                 })}
               </div>
             )}
          </div>
        </div>
      </div>

      {/* Pro Upgrade Modal */}
      <ProUpgradeModal open={showProModal} onClose={() => setShowProModal(false)} dismissible />

      {/* First-run tour + 1-week survey */}
      {showTour && <OnboardingTour onClose={() => setShowTour(false)} />}
      <SurveyPrompt createdAt={user?.metadata?.creationTime} />

    </div>
  );
}
