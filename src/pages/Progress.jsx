import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserProfile } from "../lib/userProfile";
import { getRandomQuestions } from "../data/questions/compat";
import { ACHIEVEMENTS } from "../config/achievements";
import { collection, query, where, limit, getDocs, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { TrendingUp } from "lucide-react";

const SUBJECT_ICONS = {
  Biology: "🧬", Chemistry: "🧪", Physics: "⚛️", Mathematics: "📐",
  English: "📖", Economics: "📊", Government: "🏛️",
};

function getSubjectIcon(s) { return SUBJECT_ICONS[s] || "📚"; }

function SkeletonRow() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
      {[1, 2, 3, 4].map(i => <div key={i} className="shimmer" style={{ height: 100, borderRadius: 16, background: "var(--bg-3)" }} />)}
    </div>
  );
}

export default function Progress() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [mockExams, setMockExams] = useState([]);
  const [displayStreak, setDisplayStreak] = useState(0);
  const [displayXP, setDisplayXP] = useState(0);
  const [displayAnswered, setDisplayAnswered] = useState(0);
  const [displayMocks, setDisplayMocks] = useState(0);
  const [newAchievements, setNewAchievements] = useState([]);
  const [mockPage, setMockPage] = useState(1);
  const animRefs = useRef([]);

  function animateNumber(setter, target) {
    const start = performance.now();
    const duration = 1000;
    function frame(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const cur = Math.round(target * progress);
      setter(cur);
      if (progress < 1) animRefs.current.push(requestAnimationFrame(frame));
    }
    animRefs.current.push(requestAnimationFrame(frame));
  }

  useEffect(() => { document.title = "Progress — ExamPadi"; }, []);

  useEffect(() => {
    async function fetch() {
      if (!user) return;
      try {
        const p = await getUserProfile(user.uid);
        setProfile(p);

        const sesQ = query(collection(db, "sessions"), where("userId", "==", user.uid), limit(50));
        const sesSnap = await getDocs(sesQ);
        const ses = []; sesSnap.forEach(d => ses.push({ id: d.id, ...d.data() }));
        ses.sort((a, b) => (b.completedAt?.seconds || 0) - (a.completedAt?.seconds || 0));
        setSessions(ses);

        const mockQ = query(collection(db, "mockExams"), where("userId", "==", user.uid), limit(20));
        const mockSnap = await getDocs(mockQ);
        const mocks = []; mockSnap.forEach(d => mocks.push({ id: d.id, ...d.data() }));
        mocks.sort((a, b) => (b.completedAt?.seconds || 0) - (a.completedAt?.seconds || 0));
        setMockExams(mocks);

        // Achievement check
        const totalQ = p?.totalQuestionsAnswered || 0;
        const streak = p?.streak || 0;
        const totalXP = p?.totalXP || 0;
        const mockCount = mocks.length;
        const bestScore = ses.length > 0 ? Math.max(...ses.map(s => s.score || 0)) : 0;
        const stats = { totalQuestionsAnswered: totalQ, streak, totalXP, mockExamsCompleted: mockCount, bestScore };

        const existing = p?.achievements || [];
        const newlyUnlocked = ACHIEVEMENTS.filter(a => a.condition(stats) && !existing.includes(a.id));
        if (newlyUnlocked.length > 0 && db) {
          await updateDoc(doc(db, "users", user.uid), { achievements: arrayUnion(...newlyUnlocked.map(a => a.id)) });
          setNewAchievements(newlyUnlocked);
        }

        // Animate numbers
        animateNumber(setDisplayStreak, streak);
        animateNumber(setDisplayXP, totalXP);
        animateNumber(setDisplayAnswered, totalQ);
        animateNumber(setDisplayMocks, mockCount);

      } catch (e) { console.warn("Progress fetch error:", e); }
      setLoading(false);
    }
    fetch();
    const refs = animRefs.current;
    return () => { refs.forEach(cancelAnimationFrame); };
  }, [user]);

  const totalXP = profile?.totalXP || 0;
  const streak = profile?.streak || 0;
  const subjects = profile?.subjects || [];
  const level = Math.floor(totalXP / 500) + 1;
  const xpInLevel = totalXP % 500;
  const xpToNext = 500 - xpInLevel;
  const avgMockScore = mockExams.length > 0 ? Math.round(mockExams.reduce((a, s) => a + (s.overallScore || 0), 0) / mockExams.length) : 0;

  // Build subject stats from sessions
  const subjectStats = {};
  subjects.forEach(s => { subjectStats[s] = { correct: 0, total: 0, best: 0 }; });
  sessions.forEach(ses => {
    if (subjectStats[ses.subject]) {
      subjectStats[ses.subject].total += ses.total || 0;
      subjectStats[ses.subject].correct += ses.correct || 0;
      subjectStats[ses.subject].best = Math.max(subjectStats[ses.subject].best, ses.score || 0);
    }
  });

  // Aggregate weak topics from all sessions
  const weakTopics = {};
  sessions.forEach(ses => {
    (ses.weakTopics || []).forEach(t => { weakTopics[t] = (weakTopics[t] || 0) + 1; });
  });
  const topWeak = Object.entries(weakTopics).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const scoreChartData = sessions.slice(0, 10).reverse();
  const chartWidth = 600, chartHeight = 200;

  function chartPath() {
    if (scoreChartData.length < 2) return "";
    const points = scoreChartData.map((s, i) => {
      const x = (i / (scoreChartData.length - 1)) * (chartWidth - 60) + 30;
      const y = chartHeight - 30 - ((s.score || 0) / 100) * (chartHeight - 60);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    });
    return points.join(" ");
  }

  if (loading) return <div style={{ minHeight: "100vh", background: "var(--bg)" }} className="page-content"><SkeletonRow /></div>;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "'Inter', system-ui, sans-serif", color: "var(--text)" }} className="page-content">
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Your Progress</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "4px 0 0" }}>Track your journey to exam success</p>
          </div>
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Last updated just now</span>
        </div>

        {/* New achievements toast */}
        {newAchievements.map(a => (
          <div key={a.id} style={{ background: "rgb(var(--accent-rgb) / 0.1)", border: "1px solid rgb(var(--accent-rgb) / 0.3)", borderRadius: 12, padding: "12px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>{a.icon}</span>
            <div><div style={{ fontWeight: 700, color: "var(--accent)" }}>🏆 Achievement Unlocked: {a.name}!</div><div style={{ fontSize: 12, color: "var(--text-muted)" }}>{a.desc}</div></div>
          </div>
        ))}

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
          {[
            { icon: "🔥", label: "Current Streak", value: `${displayStreak} days`, sub: "Keep it going!", color: streak >= 7 ? "var(--accent)" : "var(--primary)", glow: streak >= 7 },
            { icon: "⚡", label: "Total XP", value: `${displayXP} XP`, sub: `Level ${level}` },
            { icon: "✅", label: "Questions Answered", value: displayAnswered, sub: "Across all subjects" },
            { icon: "🎯", label: "Mock Exams", value: displayMocks, sub: `Avg score: ${avgMockScore}%` },
          ].map((s, i) => (
            <div key={i} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, borderLeft: `4px solid ${s.color || "var(--primary)"}`, boxShadow: s.glow ? "0 0 20px rgb(var(--accent-rgb) / 0.15)" : "none" }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}><span>{s.icon}</span> {s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text)" }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Level progress */}
        <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ padding: "4px 12px", borderRadius: 8, background: "var(--primary)", color: "#fff", fontSize: 12, fontWeight: 700 }}>Level {level}</span>
            <div style={{ flex: 1, margin: "0 16px", height: 8, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: `${(xpInLevel / 500) * 100}%`, height: "100%", background: "var(--primary)", borderRadius: 4 }} />
            </div>
            <span style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 600 }}>Level {level + 1}</span>
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: 12 }}>🏆 {xpToNext} XP to next level</div>
        </div>

        {/* Score chart */}
        <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>Score Trend</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 12, margin: "0 0 20px" }}>Last {scoreChartData.length} sessions</p>
          {scoreChartData.length < 2 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
              <TrendingUp size={40} style={{ opacity: 0.3, margin: "0 auto 12px", display: "block" }} />
              <p style={{ fontSize: 14 }}>Complete at least 2 practice sessions to see your trend</p>
            </div>
          ) : (
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: "100%", height: "auto" }}>
              {[25, 50, 75, 100].map(pct => (
                <line key={pct} x1={30} y1={chartHeight - 30 - ((pct / 100) * (chartHeight - 60))} x2={chartWidth - 30} y2={chartHeight - 30 - ((pct / 100) * (chartHeight - 60))} stroke="var(--border)" strokeWidth={1} />
              ))}
              <path d={chartPath()} fill="none" stroke="var(--primary)" strokeWidth={2} />
              {scoreChartData.map((s, i) => {
                const x = (i / (scoreChartData.length - 1)) * (chartWidth - 60) + 30;
                const y = chartHeight - 30 - ((s.score || 0) / 100) * (chartHeight - 60);
                return <circle key={i} cx={x} cy={y} r={4} fill="#fff" stroke="var(--primary)" strokeWidth={2} />;
              })}
            </svg>
          )}
        </div>

        {/* Subject breakdown */}
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Subject Performance</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16, marginBottom: 24 }}>
          {subjects.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>No subjects selected</p>
          ) : (
            subjects.map(s => {
              const stats = subjectStats[s] || { correct: 0, total: 0, best: 0 };
              const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
              const ringColor = pct >= 85 ? "var(--accent)" : pct >= 70 ? "#4ADE80" : pct >= 50 ? "#FF9F43" : "#FF4D6A";
              return (
                <div key={s} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 24 }}>{getSubjectIcon(s)}</span>
                    <span style={{ fontWeight: 700, fontSize: 16, color: "var(--text)" }}>{s}</span>
                  </div>
                  <div style={{ position: "relative", width: 80, height: 80, margin: "0 auto 12px" }}>
                    <svg width="80" height="80" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" fill="none" stroke="var(--border)" strokeWidth="6" />
                      <circle cx="40" cy="40" r="34" fill="none" stroke={ringColor} strokeWidth="6" strokeDasharray={`${(pct / 100) * 214} 214`} strokeLinecap="round" transform="rotate(-90 40 40)" />
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "var(--text)" }}>{pct}%</div>
                  </div>
                  <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>{stats.correct}/{stats.total} correct</div>
                  {stats.total > 0 && <div style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>Best: {stats.best}%</div>}
                  {stats.total === 0 && <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>Not started yet</div>}
                  <button onClick={() => navigate("/practice", { state: { questions: getRandomQuestions(s, 10), subject: s, mode: "practice" } })} style={{ width: "100%", padding: "8px", borderRadius: 8, background: "transparent", border: "1.5px solid var(--primary)", color: "var(--primary)", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                    {stats.total > 0 ? "Practice Now →" : "Begin →"}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Mock Exam History */}
        {mockExams.length > 0 && (
          <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", marginBottom: 24 }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", fontSize: 16, fontWeight: 700 }}>Mock Exam History</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--bg-3)" }}>
                    {["Date", "Exam Type", "Score", "JAMB/400", "Grade", "Time Used", ""].map(h => <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {mockExams.slice((mockPage - 1) * 5, mockPage * 5).map((m, i) => {
                    const g = m.overallScore >= 75 ? { l: "A", c: "#4ADE80" } : m.overallScore >= 60 ? { l: "B", c: "#4D9EFF" } : m.overallScore >= 50 ? { l: "C", c: "#FF9F43" } : { l: "F", c: "#FF4D6A" };
                    return (
                      <tr key={m.id || i} style={{ background: i % 2 === 0 ? "var(--bg-2)" : "var(--bg)", cursor: "pointer" }}>
                        <td style={{ padding: "12px 16px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{m.completedAt?.toDate?.().toLocaleDateString?.() || "Recent"}</td>
                        <td style={{ padding: "12px 16px", color: "var(--text)" }}>{m.examType}</td>
                        <td style={{ padding: "12px 16px", color: "var(--text)", fontWeight: 700 }}>{m.overallScore}%</td>
                        <td style={{ padding: "12px 16px", color: "var(--text)" }}>{m.jamb400Score}/400</td>
                        <td style={{ padding: "12px 16px" }}><span style={{ padding: "2px 8px", borderRadius: 6, background: `${g.c}22`, color: g.c, fontWeight: 700, fontSize: 12 }}>{g.l}</span></td>
                        <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>{Math.floor((m.timeUsed || 0) / 60)}m</td>
                        <td style={{ padding: "12px 16px" }}><span style={{ color: "var(--primary)", fontSize: 12, fontWeight: 600 }}>View →</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {mockExams.length > 5 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: 12 }}>
                <button disabled={mockPage <= 1} onClick={() => setMockPage(p => p - 1)} style={{ padding: "6px 14px", borderRadius: 6, background: "var(--bg-3)", border: "1px solid #333", color: mockPage <= 1 ? "var(--text-muted)" : "var(--text)", cursor: mockPage <= 1 ? "not-allowed" : "pointer", fontSize: 12 }}>Prev</button>
                <span style={{ fontSize: 12, color: "var(--text-muted)", alignSelf: "center" }}>{mockPage}/{Math.ceil(mockExams.length / 5)}</span>
                <button disabled={mockPage >= Math.ceil(mockExams.length / 5)} onClick={() => setMockPage(p => p + 1)} style={{ padding: "6px 14px", borderRadius: 6, background: "var(--bg-3)", border: "1px solid #333", color: mockPage >= Math.ceil(mockExams.length / 5) ? "var(--text-muted)" : "var(--text)", cursor: mockPage >= Math.ceil(mockExams.length / 5) ? "not-allowed" : "pointer", fontSize: 12 }}>Next</button>
              </div>
            )}
          </div>
        )}

        {/* Weak Topics */}
        {topWeak.length > 0 && (
          <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>Areas to Improve</h3>
            {topWeak.map(([topic, count]) => {
              const wRate = Math.min(count / (sessions.length || 1), 1);
              return (
                <div key={topic} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{topic}</span>
                    <span style={{ fontSize: 11, color: "#FF6B6B" }}>{count} wrong</span>
                  </div>
                  <div style={{ height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${wRate * 100}%`, height: "100%", background: "#FF4D6A", borderRadius: 3 }} />
                  </div>
                  <button onClick={() => navigate("/practice", { state: { questions: getRandomQuestions(subjects[0] || "Biology", 10), subject: subjects[0] || "Biology", mode: "practice" } })} style={{ marginTop: 4, background: "none", border: "none", color: "var(--primary)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
                    Fix This →
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {topWeak.length === 0 && sessions.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Start your first practice session</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 20 }}>to see your progress here</p>
            <button onClick={() => navigate("/practice-select")} style={{ padding: "12px 28px", borderRadius: 10, background: "var(--primary)", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Practice Now →
            </button>
          </div>
        )}

        {/* Achievements */}
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Achievements</h2>
        <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8, marginBottom: 24 }}>
          {ACHIEVEMENTS.map(a => {
            const existingBadges = profile?.achievements || [];
            const showUnlocked = existingBadges.includes(a.id);
            return (
              <div key={a.id} style={{ minWidth: 140, background: "var(--bg-2)", border: showUnlocked ? "1px solid rgb(var(--accent-rgb) / 0.4)" : "1px solid #333", borderRadius: 12, padding: 16, textAlign: "center", filter: showUnlocked ? "none" : "grayscale(1)", opacity: showUnlocked ? 1 : 0.5, position: "relative" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{a.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{a.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{a.desc}</div>
                {!showUnlocked && <div style={{ position: "absolute", top: 8, right: 8, fontSize: 14 }}>🔒</div>}
                {showUnlocked && <div style={{ fontSize: 10, color: "var(--accent)", marginTop: 4 }}>Unlocked ✓</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}