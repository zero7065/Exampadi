// src/pages/FlashcardsPage.jsx - AI flashcard revision
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { generateFlashcards, getAIErrorIfRecent } from "../lib/ai";
import { checkAILimit } from "../lib/usageTracker";
import { PLANS } from "../config/plans";
import { unlockAchievement } from "../lib/achievements";
import { JAMB_SUBJECTS, WAEC_SUBJECTS } from "../data/subjects";
import { Layers, Sparkles, Loader2, ChevronLeft, ChevronRight, RotateCcw, Check, X } from "lucide-react";

export default function FlashcardsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [exam, setExam] = useState("JAMB");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState({});

  const subjects = exam === "JAMB" ? JAMB_SUBJECTS : WAEC_SUBJECTS;

  async function handleGenerate() {
    if (!subject) return toast({ message: "Select a subject first", type: "warning" });
    setLoading(true);
    setCards([]);
    setIndex(0);
    setFlipped(false);
    setKnown({});
    try {
      const limit = await checkAILimit(user?.uid);
      if (!limit.allowed) {
        toast({ message: `AI limit reached. Upgrade to Pro or buy a 50-message pack (₦1,500) to continue.`, type: "warning" });
        return;
      }
      const result = await generateFlashcards({ subject, topic: topic.trim() || null, count, exam });
      if (result.length === 0) {
        const aiErr = getAIErrorIfRecent();
        toast({ message: aiErr ? `Flashcard generation failed: ${aiErr.message}` : "No flashcards returned — try again", type: "error" });
        return;
      }
      setCards(result);
      toast({ message: `${result.length} flashcards ready! 🃏`, type: "success" });
      if (user) {
        unlockAchievement(user.uid, "first_flashcard").then((unlocked) => {
          if (unlocked) toast({ message: "🏆 Achievement unlocked: Card Shark!", type: "success" });
        }).catch(() => {});
      }
    } catch (err) {
      toast({ message: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  function flip() { setFlipped(f => !f); }
  function prev() { setFlipped(false); setIndex(i => Math.max(0, i - 1)); }
  function next() { setFlipped(false); setIndex(i => Math.min(cards.length - 1, i + 1)); }
  function markKnown(state) {
    setKnown(k => ({ ...k, [cards[index].id]: state }));
    next();
  }
  function restart() {
    setIndex(0);
    setFlipped(false);
    setKnown({});
  }

  const current = cards[index];
  const knownCount = Object.values(known).filter(Boolean).length;

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-10 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
          <Layers size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">AI Flashcards</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Generate revision cards on any topic — flip, mark, repeat.
          </p>
        </div>
      </div>

      <div className="glass-card p-5 space-y-4">
        <div className="flex flex-wrap gap-3">
          <select value={exam} onChange={e => { setExam(e.target.value); setSubject(""); }}
            className="px-4 py-2.5 rounded-xl bg-subtle border border-border text-sm" style={{ color: "var(--text)" }}>
            <option value="JAMB">JAMB</option>
            <option value="WAEC">WAEC</option>
          </select>
          <select value={subject} onChange={e => setSubject(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-subtle border border-border text-sm" style={{ color: "var(--text)" }}>
            <option value="">Select subject…</option>
            {subjects.map(s => <option key={s.id} value={s.name}>{s.icon} {s.name}</option>)}
          </select>
          <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Topic (optional)"
            className="flex-1 min-w-[160px] px-4 py-2.5 rounded-xl bg-subtle border border-border text-sm" style={{ color: "var(--text)" }} />
          <select value={count} onChange={e => setCount(Number(e.target.value))}
            className="px-4 py-2.5 rounded-xl bg-subtle border border-border text-sm" style={{ color: "var(--text)" }}>
            {[6, 10, 15, 20].map(n => <option key={n} value={n}>{n} cards</option>)}
          </select>
          <button onClick={handleGenerate} disabled={loading}
            className="btn-primary px-6 py-2.5 flex items-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? "Generating…" : "Generate"}
          </button>
        </div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Uses 1 of {PLANS.free.limits.aiTutorMessages} daily AI messages on the Free plan.
        </p>
      </div>

      {cards.length > 0 && current && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm" style={{ color: "var(--text-muted)" }}>
            <span>Card {index + 1} / {cards.length} · {knownCount} known</span>
            <span>{current.tag}</span>
          </div>

          <div className="w-full h-64 cursor-pointer select-none" onClick={flip}>
            <div className="relative w-full h-full" style={{ perspective: 1200 }}>
              <div style={{
                position: "absolute", inset: 0, transformStyle: "preserve-3d",
                transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
                transition: "transform 0.5s",
              }}>
                <div className="glass-card absolute inset-0 flex flex-col items-center justify-center p-8 text-center" style={{ backfaceVisibility: "hidden" }}>
                  <span className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--primary)" }}>Question</span>
                  <p className="text-lg font-semibold">{current.front}</p>
                  <p className="text-xs mt-6" style={{ color: "var(--text-muted)" }}>Tap to reveal answer</p>
                </div>
                <div className="glass-card absolute inset-0 flex flex-col items-center justify-center p-8 text-center border-primary/40" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                  <span className="text-xs uppercase tracking-widest mb-4 text-primary">Answer</span>
                  <p className="text-base">{current.back}</p>
                  <p className="text-xs mt-6" style={{ color: "var(--text-muted)" }}>Tap to flip back</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <button onClick={prev} disabled={index === 0}
              className="btn-secondary px-4 py-2.5 flex items-center gap-2 disabled:opacity-40">
              <ChevronLeft size={16} /> Prev
            </button>
            <div className="flex gap-2">
              <button onClick={() => markKnown(false)} title="Still learning"
                className="px-4 py-2.5 rounded-xl border border-danger/30 text-danger flex items-center gap-2 text-sm font-semibold hover:bg-danger/10">
                <X size={16} /> Again
              </button>
              <button onClick={() => markKnown(true)} title="Know it"
                className="px-4 py-2.5 rounded-xl border border-success/30 text-success flex items-center gap-2 text-sm font-semibold hover:bg-success/10">
                <Check size={16} /> Got it
              </button>
              <button onClick={flip}
                className="px-4 py-2.5 rounded-xl border border-white/15 text-sm flex items-center gap-2 hover:bg-white/5">
                <RotateCcw size={16} /> Flip
              </button>
            </div>
            <button onClick={next} disabled={index === cards.length - 1}
              className="btn-secondary px-4 py-2.5 flex items-center gap-2 disabled:opacity-40">
              Next <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex justify-center">
            <button onClick={restart} className="text-sm underline" style={{ color: "var(--text-muted)" }}>
              Restart deck
            </button>
          </div>
        </div>
      )}

      {cards.length === 0 && !loading && (
        <div className="glass-card p-10 text-center space-y-3">
          <Layers size={40} className="mx-auto" style={{ color: "var(--text-muted)" }} />
          <p className="font-semibold">No cards yet</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Pick a subject (and optional topic) and hit Generate to build an AI flashcard deck.
          </p>
        </div>
      )}
    </div>
  );
}
