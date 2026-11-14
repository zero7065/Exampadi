// Games hub — trivia, brain teasers, patterns, chess entry.
// Games unlocked for Pro & team/community members.
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSubscription } from "../hooks/useSubscription";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import ProGate from "../components/ProGate";
import { TRIVIA_QUESTIONS, BRAIN_TEASERS, PATTERNS, GAME_CATEGORIES } from "../data/games";
import { getPartners } from "../lib/studyPartners";
import {
  createChallenge, subscribeIncomingChallenges, respondChallenge,
} from "../lib/games/challenges";
import { ArrowLeft, Brain, Lightbulb, Hash, Trophy, Crown, CheckCircle2, XCircle, ChevronRight, RotateCcw, Sparkles, Swords, Check, X, Loader2 } from "lucide-react";

export default function GamesPage() {
  const { isPro } = useSubscription();
  const { user } = useAuth();
  const { toast } = useToast();
  const [active, setActive] = useState(null); // category id
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [teaserAnswer, setTeaserAnswer] = useState("");
  const [partners, setPartners] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [challengeForm, setChallengeForm] = useState({ toUid: "", toName: "", game: "chess", level: 5 });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) return;
    getPartners(user.uid).then(setPartners).catch(() => {});
    const unsub = subscribeIncomingChallenges(user.uid, setIncoming);
    return () => unsub();
  }, [user]);

  function start(cat) {
    setActive(cat);
    setIdx(0);
    setScore(0);
    setPicked(null);
    setShowAnswer(false);
    setTeaserAnswer("");
  }

  function resetGame() {
    setIdx(0);
    setScore(0);
    setPicked(null);
    setShowAnswer(false);
    setTeaserAnswer("");
  }

  if (!isPro) {
    return (
      <div className="page-content max-w-2xl mx-auto">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-semibold mb-4" style={{ color: "var(--text-muted)" }}><ArrowLeft size={16} /> Dashboard</Link>
        <ProGate feature="Games & Chess">
          <div style={{ height: 300 }} />
        </ProGate>
      </div>
    );
  }

  return (
    <div className="page-content max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Link to="/dashboard" className="p-2 rounded-lg hover:bg-subtle" aria-label="Back"><ArrowLeft size={18} /></Link>
        <h1 className="text-xl font-black flex items-center gap-2"><Trophy size={18} className="text-amber-500" /> Games & Brain Training</h1>
      </div>

      {!active ? (
        <>
          <p className="text-sm text-text-muted">Sharpen your mind with quick games. Win streaks earn XP and achievements.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {GAME_CATEGORIES.map((g) => (
              <div key={g.id} className="glass-card p-5" style={{ cursor: "pointer", borderColor: "rgb(var(--primary-rgb) / 0.25)" }}
                onClick={() => g.id === "chess" ? (window.location.href = "/games/chess") : start(g.id)}>
                <div className="text-3xl mb-2">{g.icon}</div>
                <div className="font-black text-text text-lg">{g.label}</div>
                <div className="text-xs text-text-muted mt-1">{g.desc}</div>
                <div className="flex items-center gap-1 text-xs font-bold mt-3" style={{ color: "var(--primary)" }}>
                  Play <ChevronRight size={13} />
                </div>
              </div>
            ))}
          </div>

          {/* Challenges */}
          <div className="glass-card p-5 mt-2">
            <div className="flex items-center gap-2 mb-3">
              <Swords size={18} className="text-danger" />
              <h2 className="font-black text-text">Challenge a friend</h2>
            </div>
            {partners.length === 0 ? (
              <p className="text-xs text-text-muted">Add study partners first to challenge them at chess or trivia. <Link to="/study-partners" className="text-primary font-semibold">Add partners →</Link></p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                <select
                  value={challengeForm.toUid}
                  onChange={(e) => {
                    const p = partners.find((x) => x.uid === e.target.value);
                    setChallengeForm({ ...challengeForm, toUid: e.target.value, toName: p?.displayName || p?.name || "" });
                  }}
                  className="input-field"
                >
                  <option value="">Choose a partner…</option>
                  {partners.map((p) => <option key={p.uid} value={p.uid}>{p.displayName || p.name || p.uid}</option>)}
                </select>
                <div className="flex gap-2">
                  <select value={challengeForm.game} onChange={(e) => setChallengeForm({ ...challengeForm, game: e.target.value })} className="input-field" style={{ maxWidth: 120 }}>
                    <option value="chess">Chess</option>
                    <option value="trivia">Trivia</option>
                  </select>
                  <button
                    onClick={async () => {
                      if (!challengeForm.toUid) { toast({ message: "Pick a partner", type: "warning" }); return; }
                      setSending(true);
                      try {
                        await createChallenge({
                          fromUid: user.uid,
                          fromName: user.displayName || "Student",
                          toUid: challengeForm.toUid,
                          toName: challengeForm.toName,
                          game: challengeForm.game,
                          level: challengeForm.level,
                        });
                        toast({ message: "Challenge sent ✓", type: "success" });
                        setChallengeForm({ toUid: "", toName: "", game: "chess", level: 5 });
                      } catch (e) {
                        toast({ message: e.message, type: "error" });
                      } finally {
                        setSending(false);
                      }
                    }}
                    disabled={sending}
                    className="btn-primary px-4 text-xs whitespace-nowrap"
                  >
                    {sending ? <Loader2 size={13} className="animate-spin" /> : <Swords size={13} />} Challenge
                  </button>
                </div>
              </div>
            )}

            {incoming.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="text-xs font-bold text-text-muted uppercase tracking-widest">Incoming ({incoming.length})</div>
                {incoming.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 p-2 rounded-xl" style={{ background: "var(--bg-3)" }}>
                    <span className="text-sm flex-1"><strong>{c.fromName}</strong> challenges you at {c.game}</span>
                    <button onClick={() => respondChallenge(c.id, true, user.uid)} className="p-1.5 rounded-lg" style={{ background: "rgba(74,222,128,0.15)", color: "var(--success)" }} title="Accept"><Check size={14} /></button>
                    <button onClick={() => respondChallenge(c.id, false, user.uid)} className="p-1.5 rounded-lg" style={{ background: "rgba(255,77,106,0.12)", color: "var(--danger)" }} title="Decline"><X size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <GamePlayer
          category={active}
          idx={idx}
          score={score}
          picked={picked}
          showAnswer={showAnswer}
          teaserAnswer={teaserAnswer}
          setTeaserAnswer={setTeaserAnswer}
          onPick={(i) => { if (picked !== null) return; setPicked(i); if (i === TRIVIA_QUESTIONS[idx]?.a) setScore((s) => s + 1); }}
          onNext={() => {
            const len = active === "trivia" ? TRIVIA_QUESTIONS.length : active === "teasers" ? BRAIN_TEASERS.length : PATTERNS.length;
            if (idx + 1 >= len) { setActive(null); return; }
            setIdx((i) => i + 1); setPicked(null); setShowAnswer(false); setTeaserAnswer("");
          }}
          onReveal={() => setShowAnswer(true)}
          onBack={() => setActive(null)}
          onReset={resetGame}
        />
      )}
    </div>
  );
}

function GamePlayer({ category, idx, score, picked, showAnswer, teaserAnswer, setTeaserAnswer, onPick, onNext, onReveal, onBack, onReset }) {
  if (category === "trivia") {
    const q = TRIVIA_QUESTIONS[idx];
    if (!q) return null;
    return (
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--bg-3)", color: "var(--text-muted)" }}>{q.category}</span>
          <span className="text-xs text-text-muted">Q{idx + 1}/{TRIVIA_QUESTIONS.length} · Score: {score}</span>
        </div>
        <h2 className="text-lg font-bold">{q.q}</h2>
        <div className="grid gap-2">
          {q.o.map((opt, i) => {
            const isPicked = picked === i;
            const isCorrect = q.a === i;
            const revealed = picked !== null;
            return (
              <button key={i} onClick={() => onPick(i)} disabled={revealed}
                style={{
                  textAlign: "left", padding: "12px 14px", borderRadius: 10, fontSize: 14, fontFamily: "inherit",
                  background: revealed && isCorrect ? "rgba(74,222,128,0.15)" : revealed && isPicked ? "rgba(255,77,106,0.12)" : "var(--bg-3)",
                  border: revealed && isCorrect ? "1.5px solid var(--success)" : revealed && isPicked ? "1.5px solid var(--danger)" : "1px solid var(--border)",
                  color: "var(--text)", cursor: revealed ? "default" : "pointer",
                }}>
                {revealed && isCorrect && <CheckCircle2 size={15} style={{ display: "inline", marginRight: 6, color: "var(--success)" }} />}
                {revealed && isPicked && !isCorrect && <XCircle size={15} style={{ display: "inline", marginRight: 6, color: "var(--danger)" }} />}
                {String.fromCharCode(65 + i)}) {opt}
              </button>
            );
          })}
        </div>
        {picked !== null && (
          <div className="flex gap-2">
            <button onClick={onNext} className="btn-primary flex-1">{idx + 1 >= TRIVIA_QUESTIONS.length ? "Finish" : "Next"} →</button>
            <button onClick={onBack} className="btn-secondary px-4">Exit</button>
          </div>
        )}
      </div>
    );
  }

  if (category === "teasers") {
    const t = BRAIN_TEASERS[idx];
    if (!t) return null;
    return (
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--bg-3)", color: "var(--text-muted)" }}><Lightbulb size={10} style={{ display: "inline" }} /> Brain Teaser</span>
          <span className="text-xs text-text-muted">Q{idx + 1}/{BRAIN_TEASERS.length}</span>
        </div>
        <h2 className="text-lg font-bold leading-relaxed">{t.q}</h2>
        {!showAnswer ? (
          <div className="space-y-2">
            <input value={teaserAnswer} onChange={(e) => setTeaserAnswer(e.target.value)} placeholder="Type your answer (or just reveal)…" className="input-field"
              onKeyDown={(e) => e.key === "Enter" && onReveal()} />
            <div className="flex gap-2">
              <button onClick={onReveal} className="btn-primary flex-1"><Sparkles size={14} style={{ display: "inline", marginRight: 4 }} /> Reveal answer</button>
              <button onClick={onBack} className="btn-secondary px-4">Exit</button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 rounded-xl" style={{ background: "rgb(var(--primary-rgb) / 0.1)", border: "1px solid rgb(var(--primary-rgb) / 0.3)" }}>
              <div className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: "var(--primary)" }}>Answer</div>
              <div className="text-lg font-bold">{t.a}</div>
              <div className="text-xs text-text-muted mt-1">💡 {t.hint}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={onNext} className="btn-primary flex-1">{idx + 1 >= BRAIN_TEASERS.length ? "Finish" : "Next"} →</button>
              <button onClick={onBack} className="btn-secondary px-4">Exit</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (category === "patterns") {
    const p = PATTERNS[idx];
    if (!p) return null;
    const correct = teaserAnswer.trim() === p.answer;
    return (
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--bg-3)", color: "var(--text-muted)" }}><Hash size={10} style={{ display: "inline" }} /> Pattern</span>
          <span className="text-xs text-text-muted">Q{idx + 1}/{PATTERNS.length}</span>
        </div>
        <div className="text-center py-4 text-2xl font-black tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{p.seq}</div>
        {!showAnswer ? (
          <div className="space-y-2">
            <input value={teaserAnswer} onChange={(e) => setTeaserAnswer(e.target.value)} placeholder="Next in the sequence…" className="input-field text-center"
              onKeyDown={(e) => e.key === "Enter" && onReveal()} />
            <div className="flex gap-2">
              <button onClick={onReveal} className="btn-primary flex-1">Check answer</button>
              <button onClick={onBack} className="btn-secondary px-4">Exit</button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 rounded-xl text-center" style={{ background: correct ? "rgba(74,222,128,0.12)" : "rgba(255,159,67,0.12)", border: `1px solid ${correct ? "var(--success)" : "#FF9F43"}` }}>
              <div className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: correct ? "var(--success)" : "#FF9F43" }}>{correct ? "Correct!" : "Answer"}</div>
              <div className="text-2xl font-black">{p.answer}</div>
              <div className="text-xs text-text-muted mt-1">{p.rule}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={onNext} className="btn-primary flex-1">{idx + 1 >= PATTERNS.length ? "Finish" : "Next"} →</button>
              <button onClick={onBack} className="btn-secondary px-4">Exit</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}