import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useAuth } from "../context/AuthContext";
import AvatarDisplay from "../components/Avatar/AvatarDisplay";
import { getActiveBadge } from "../lib/achievements";
import { Trophy, Crown, Medal, Award, Flame, TrendingUp } from "lucide-react";

const podiumColors = [
  { bg: "from-amber-400 to-amber-600", shadow: "shadow-amber-500/20", icon: Crown },
  { bg: "from-slate-300 to-slate-500", shadow: "shadow-slate-400/20", icon: Medal },
  { bg: "from-orange-400 to-orange-600", shadow: "shadow-orange-500/20", icon: Award },
];

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState(null);

  useEffect(() => {
    async function fetchLeaders() {
      // 5-minute cache: leaderboard is identical for everyone
      try {
        const raw = localStorage.getItem("ep_leaderboard_cache");
        if (raw) {
          const cached = JSON.parse(raw);
          if (Date.now() - cached.at < 5 * 60 * 1000 && Array.isArray(cached.data)) {
            setLeaders(cached.data);
            if (user) {
              const idx = cached.data.findIndex(d => d.id === user.uid);
              setUserRank(idx >= 0 ? { rank: idx + 1, xp: cached.data[idx].xp } : { rank: cached.data.length + 1, xp: 0 });
            }
            setLoading(false);
            return;
          }
        }
      } catch { /* cache optional */ }
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, orderBy("xp", "desc"), limit(50));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc, i) => ({
          rank: i + 1,
          id: doc.id,
          name: doc.data().name || "Student",
          xp: doc.data().xp || 0,
          streak: doc.data().streak || doc.data().currentStreak || 0,
          lastActive: doc.data().lastActive || null,
          subjects: doc.data().subjects || [],
          photoURL: doc.data().photoURL || null,
          avatarPreset: doc.data().avatarPreset || null,
        }));
        setLeaders(data);
        try {
          localStorage.setItem("ep_leaderboard_cache", JSON.stringify({ at: Date.now(), data }));
        } catch { /* cache optional */ }

        if (user) {
          const idx = data.findIndex(d => d.id === user.uid);
          if (idx >= 0) {
            setUserRank({ rank: idx + 1, xp: data[idx].xp });
          } else {
            setUserRank({ rank: data.length + 1, xp: 0 });
          }
        }
      } catch (e) {
        console.error("Failed to load leaderboard:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaders();
  }, [user]);

  if (loading) {
    return (
      <div className="page-content flex items-center justify-center" style={{ minHeight: "60vh" }}>
        <div className="w-8 h-8 rounded-full border-3 border-border border-t-primary animate-spin" />
      </div>
    );
  }

  const top3 = leaders.slice(0, 3);
  const rest = leaders.slice(3);

  return (
    <div className="page-content space-y-8">
      <header className="animate-fade">
        <h1 className="text-3xl font-black tracking-tight">Leaderboard</h1>
        <p className="text-text-muted mt-1">Top students ranked by XP</p>
      </header>

      {top3.length >= 3 && (
        <div className="grid grid-cols-3 gap-2 md:gap-4 items-end">
          {[top3[1], top3[0], top3[2]].map((entry, i) => {
            const actualRank = i === 0 ? 2 : i === 1 ? 1 : 3;
            const pc = podiumColors[actualRank - 1];
            const podiumH = actualRank === 1 ? "h-36" : actualRank === 2 ? "h-28" : "h-24";
            const Icon = pc.icon;
            return (
              <div
                key={entry.id}
                className="flex flex-col items-center gap-3 animate-scale-in"
                style={{ animationDelay: `${actualRank * 0.15}s` }}
              >
                <div className="text-center space-y-1">
                  <div className="mx-auto w-fit">
                    <AvatarDisplay profile={entry} size={52} radius={26} />
                  </div>
                  <p className="font-bold text-xs md:text-sm text-text truncate max-w-[80px]">{entry.name}</p>
                  <p className="text-[10px] md:text-xs font-medium text-text-muted">{entry.xp.toLocaleString()} XP</p>
                </div>
                <div className={`w-full rounded-t-2xl flex items-center justify-center ${podiumH}`}
                  style={{ background: actualRank === 1
                    ? "linear-gradient(to top, rgba(245,158,11,0.15), transparent)"
                    : actualRank === 2
                    ? "linear-gradient(to top, rgba(148,163,184,0.15), transparent)"
                    : "linear-gradient(to top, rgba(251,146,60,0.15), transparent)"
                  }}>
                  <Icon className={`w-8 h-8 ${actualRank === 1 ? "text-amber-500" : actualRank === 2 ? "text-slate-400" : "text-orange-500"}`} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-2 stagger-enter">
        {rest.map((entry) => (
          <div key={entry.id} className={`glass-card p-3 md:p-4 flex items-center justify-between ${entry.id === user?.uid ? "ring-2 ring-primary" : ""}`}>
            <div className="flex items-center gap-3 md:gap-4 min-w-0">
              <span className="w-6 md:w-8 text-center font-bold text-text-muted text-xs md:text-sm">#{entry.rank}</span>
              <div className="w-8 h-8 md:w-10 md:h-10 flex-shrink-0">
                <AvatarDisplay profile={entry} size={40} radius={20} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-text text-sm truncate">
                  {entry.name}{entry.id === user?.uid ? " (You)" : ""}
                  {(() => { const b = getActiveBadge(entry); return b ? <span style={{ fontSize: 11, fontWeight: 800, color: b.color, marginLeft: 6 }}>{b.label}</span> : null; })()}
                </p>
                <div className="flex gap-1.5 mt-0.5 flex-wrap">
                  {(entry.subjects || []).slice(0, 3).map(s => (
                    <span key={s} className="text-xs px-2 py-0.5 rounded-md" style={{ background: "var(--bg-3)", color: "var(--text-muted)" }}>{s}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
              <div className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-muted)" }}>
                <Flame size={16} className="text-orange-400" />
                <span className="font-medium" style={{ color: "var(--text)" }}>{entry.streak}</span>
              </div>
              <span className="font-bold" style={{ color: "var(--primary)" }}>{entry.xp.toLocaleString()} XP</span>
            </div>
          </div>
        ))}
      </div>

      {leaders.length === 0 && (
        <div className="glass-card p-8 text-center">
          <Trophy size={48} className="mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
          <h3 className="text-lg font-bold text-text mb-2">No rankings yet</h3>
          <p className="text-text-muted text-sm">Be the first to earn XP and climb the leaderboard!</p>
        </div>
      )}

      {user && userRank && (
        <div className="glass-card p-3 md:p-4 flex items-center justify-between flex-wrap gap-3" style={{ background: "var(--primary-dim)", borderColor: "var(--primary)" }}>
          <div className="flex items-center gap-3">
            <TrendingUp size={20} style={{ color: "var(--primary)" }} />
            <p className="text-xs md:text-sm font-medium" style={{ color: "var(--text)" }}>
              You're ranked <strong style={{ color: "var(--primary)" }}>#{userRank.rank}</strong>
              {userRank.rank > 3 && <span style={{ color: "var(--text-muted)" }}> — keep practicing to climb higher!</span>}
            </p>
          </div>
          <Link to="/select" className="btn-primary text-sm py-2 px-4">Practice Now</Link>
        </div>
      )}
    </div>
  );
}
