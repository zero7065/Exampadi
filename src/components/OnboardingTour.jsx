// First-run product tour: 4 cards with deep links. Shows once after
// onboarding (localStorage), replayable from Help ("Take the tour").
import { useState } from "react";
import { Link } from "react-router-dom";
import { markTourSeen } from "../lib/tour";
import { Zap, Bot, Users, Trophy, X, ArrowRight, ArrowLeft, BookOpen, Layers, Settings, PenTool, Gamepad2, MessagesSquare, Crown } from "lucide-react";

const STEPS = [
  {
    icon: Zap, title: "1 · Practice real questions",
    body: "Pick your exam and subjects, answer 10–20 questions, and read every AI explanation — even for ones you got right. That review loop is where marks come from.",
    to: "/select", cta: "Start practicing",
  },
  {
    icon: Bot, title: "2 · Meet your AI Tutor",
    body: "Stuck? Ask in plain words — or snap a photo of the question. Turn on Analyze mode to break down whole pages of notes.",
    to: "/ai-tutor", cta: "Open AI Tutor",
  },
  {
    icon: Users, title: "3 · Never study alone",
    body: "Add friends with their User ID, open a Study Room with one code, or ask the community feed when you're truly stuck.",
    to: "/study-partners", cta: "Find partners",
  },
  {
    icon: Trophy, title: "4 · Chase the board",
    body: "Streaks, XP and the leaderboard turn consistency into a game. Turn on your public profile to appear on the feed.",
    to: "/leaderboard", cta: "See leaderboard",
  },
  {
    icon: MessagesSquare, title: "5 · Your School Community",
    body: "Join your school's private group after payment or admin approval. Chat with classmates and teachers — with AI assist when you're stuck.",
    to: "/community", cta: "Open community",
  },
  {
    icon: Gamepad2, title: "6 · Games & Chess",
    body: "Play chess vs AI across 10 levels (beginner → grandmaster), plus trivia, brain teasers and pattern puzzles. Challenge friends and win badges.",
    to: "/games", cta: "Play a game",
  },
  {
    icon: Crown, title: "7 · Legend Mode",
    body: "Learn any topic through riddles, metaphors, poems, stories or edu-hacks. Adjust strictness from gentle to legend — think like a legend.",
    to: "/legend", cta: "Try Legend Mode",
  },
  {
    icon: BookOpen, title: "8 · Mock Exams & Exam Mode",
    body: "Take full-length timed mock exams that simulate real exam conditions. Get instant scores and detailed breakdowns.",
    to: "/mock-exam", cta: "Try a mock exam",
  },
  {
    icon: Layers, title: "9 · Flashcards & Study Plans",
    body: "Review key concepts with AI-generated flashcards. Follow personalized study plans that adapt to your weak topics.",
    to: "/flashcards", cta: "Browse flashcards",
  },
  {
    icon: Settings, title: "10 · Settings & Preferences",
    body: "Customize your experience: toggle exams, set learning style, manage notifications, and control your privacy.",
    to: "/settings", cta: "Open settings",
  },
  {
    icon: PenTool, title: "11 · Scratchpad & Calculator",
    body: "Use the movable scratchpad for rough work in practice and exam mode. The built-in calculator floats anywhere you drag it.",
    to: "/practice", cta: "Try the scratchpad",
  },
];

export default function OnboardingTour({ onClose }) {
  const [i, setI] = useState(0);
  const s = STEPS[i];
  const Icon = s.icon;

  function close() {
    markTourSeen();
    onClose && onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 95, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }} />
      <div className="glass-card fx-ring" style={{ position: "relative", width: "100%", maxWidth: 480, padding: 28, textAlign: "center" }}>
        <button onClick={close} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}><X size={18} /></button>
        <div style={{
          width: 64, height: 64, borderRadius: 20, margin: "0 auto 16px",
          background: "var(--landing-gradient)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
          boxShadow: "0 8px 32px rgb(var(--primary-rgb) / 0.4)",
        }}>
          <Icon size={30} />
        </div>
        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--primary)", letterSpacing: "0.08em", marginBottom: 6 }}>
          GUIDED TOUR · {i + 1}/{STEPS.length}
        </div>
        <h2 className="type-h2" style={{ marginBottom: 10 }}>{s.title}</h2>
        <p className="text-sm text-text-muted" style={{ lineHeight: 1.7, margin: "0 0 20px" }}>{s.body}</p>
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 20 }}>
          {STEPS.map((_, j) => (
            <span key={j} style={{ width: j === i ? 26 : 8, height: 8, borderRadius: 4, background: j === i ? "var(--primary)" : "var(--border)", transition: "all 0.25s ease" }} />
          ))}
        </div>
        <div className="flex gap-2">
          {i > 0 && (
            <button onClick={() => setI(i - 1)} className="btn-secondary px-4"><ArrowLeft size={15} /></button>
          )}
          <Link to={s.to} onClick={close} className="btn-primary flex-1">
            {s.cta} <ArrowRight size={15} />
          </Link>
          {i < STEPS.length - 1 && (
            <button onClick={() => setI(i + 1)} className="btn-secondary px-4">Skip</button>
          )}
        </div>
        {i === STEPS.length - 1 && (
          <button onClick={close} style={{ marginTop: 12, background: "none", border: "none", color: "var(--text-muted)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            Explore on my own
          </button>
        )}
      </div>
    </div>
  );
}
