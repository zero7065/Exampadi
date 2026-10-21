import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Brain, BookOpen, GraduationCap, Star, TrendingUp, Trophy } from "lucide-react";

const slides = [
  {
    id: 1,
    type: "question",
    title: "Real Past Questions 2014–2026",
    description: "Practice with thousands of actual JAMB, WAEC & NABTEB past questions. Every question comes with detailed AI-powered explanations.",
    icon: BookOpen,
    color: "var(--primary)",
    bg: "linear-gradient(135deg, rgb(var(--primary-rgb) / 0.14), rgb(var(--primary-rgb) / 0.04))",
  },
  {
    id: 2,
    type: "chat",
    title: "AI Tutor — Your 24/7 Study Buddy",
    description: "Stuck on a topic? Ask the AI Tutor for instant, step-by-step explanations. It's like having a personal teacher in your pocket.",
    icon: Brain,
    color: "var(--success)",
    bg: "linear-gradient(135deg, rgb(var(--success-rgb) / 0.14), rgb(var(--success-rgb) / 0.04))",
  },
  {
    id: 3,
    type: "exam",
    title: "Exam Mode — Real Exam Feel",
    description: "Experience the actual Computer-Based Test environment. Timed sessions, real JAMB/WAEC interfaces, and instant scoring.",
    icon: GraduationCap,
    color: "var(--accent)",
    bg: "linear-gradient(135deg, rgb(var(--accent-rgb) / 0.16), rgb(var(--accent-rgb) / 0.05))",
  },
  {
    id: 4,
    type: "analytics",
    title: "Smart Progress Tracking",
    description: "Track your improvement with detailed analytics. Know your strengths, weaknesses, and exactly what to study next.",
    icon: TrendingUp,
    color: "#FF9F43",
    bg: "linear-gradient(135deg, rgb(var(--accent-rgb) / 0.14), rgb(var(--primary-rgb) / 0.05))",
  },
  {
    id: 5,
    type: "streak",
    title: "Compete & Earn Badges",
    description: "Stay motivated with daily streaks, XP points, leaderboards, and achievement badges. Turn studying into a game!",
    icon: Trophy,
    color: "#FF4D6A",
    bg: "linear-gradient(135deg, rgb(var(--danger-rgb) / 0.12), rgb(var(--accent-rgb) / 0.05))",
  },
  {
    id: 6,
    type: "pro",
    title: "Pro Features — Unlock Your Potential",
    description: "Go Pro for 60–80 AI messages a month, unlimited mock exams, advanced analytics, study plans, and priority support.",
    icon: Star,
    color: "var(--accent)",
    bg: "linear-gradient(135deg, rgb(var(--primary-rgb) / 0.10), rgb(var(--accent-rgb) / 0.06))",
  },
];

function MiniPreview({ type, color }) {
  const shell = {
    width: "min(360px, 82vw)", borderRadius: 16, background: "var(--bg-card)",
    border: "1px solid var(--border)", padding: 14, textAlign: "left",
    boxShadow: "0 18px 50px rgba(0,0,0,0.28)", position: "relative", zIndex: 1,
  };
  const label = { fontSize: 10, fontWeight: 800, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" };
  const option = (text, active, letter) => (
    <div key={letter} style={{
      display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", borderRadius: 8,
      background: active ? "rgb(var(--primary-rgb) / 0.14)" : "var(--bg-2)",
      border: `1px solid ${active ? "rgb(var(--primary-rgb) / 0.45)" : "var(--border)"}`,
      marginTop: 6,
    }}>
      <span style={{
        width: 18, height: 18, borderRadius: 6, flexShrink: 0,
        background: active ? "var(--primary)" : "var(--bg-elevated)",
        color: active ? "#04120D" : "var(--text-muted)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900,
      }}>{letter}</span>
      <span style={{ fontSize: 11, color: "var(--text)", lineHeight: 1.35 }}>{text}</span>
    </div>
  );

  if (type === "question") return (
    <div style={shell}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={label}>JAMB · Physics 2019</span>
        <span style={{ fontSize: 9, color: "var(--primary)", fontWeight: 800 }}>+4 XP</span>
      </div>
      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", margin: "9px 0 4px", lineHeight: 1.45 }}>
        A body moves with uniform acceleration. Which quantity stays constant?
      </p>
      {option("Velocity", false, "A")}
      {option("Acceleration", true, "B")}
      {option("Displacement", false, "C")}
      {option("Momentum", false, "D")}
      <div style={{ marginTop: 9, fontSize: 10, color: "var(--primary)", fontWeight: 700 }}>✓ Correct — AI explanation ready</div>
    </div>
  );

  if (type === "chat") return (
    <div style={shell}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{ width: 24, height: 24, borderRadius: 8, background: "var(--primary)", color: "#04120D", display: "grid", placeItems: "center", fontWeight: 900, fontSize: 11 }}>E</div>
        <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text)" }}>ExamPadi AI Tutor</span>
        <span style={{ marginLeft: "auto", fontSize: 9, color: "var(--primary)" }}>● online</span>
      </div>
      <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "12px 12px 12px 4px", padding: "9px 11px", fontSize: 11, color: "var(--text)", lineHeight: 1.5 }}>
        Explain photosynthesis like I'm 10.
      </div>
      <div style={{ background: "rgb(var(--primary-rgb) / 0.10)", border: "1px solid rgb(var(--primary-rgb) / 0.28)", borderRadius: "12px 12px 4px 12px", padding: "9px 11px", fontSize: 11, color: "var(--text)", lineHeight: 1.55, marginTop: 8, marginLeft: 24 }}>
        Think of a leaf as a tiny kitchen. Sunlight is the cooker, water and air are the ingredients, and sugar is the meal. 🌿
      </div>
      <div style={{ marginTop: 9, display: "flex", gap: 6 }}>
        {["Save note", "Remind me", "Practice"].map((t) => (
          <span key={t} style={{ fontSize: 9, fontWeight: 700, color: color, border: `1px solid ${color}55`, background: `${color}14`, padding: "4px 7px", borderRadius: 6 }}>{t}</span>
        ))}
      </div>
    </div>
  );

  if (type === "exam") return (
    <div style={shell}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={label}>Mock Exam · Chemistry</span>
        <span style={{ fontSize: 10, fontWeight: 900, color: "var(--danger)", background: "rgb(var(--danger-rgb) / 0.12)", padding: "3px 7px", borderRadius: 6 }}>24:18</span>
      </div>
      <div style={{ height: 4, background: "var(--bg-elevated)", borderRadius: 4, overflow: "hidden", marginBottom: 10 }}>
        <div style={{ width: "42%", height: "100%", background: "var(--primary)" }} />
      </div>
      <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", margin: "0 0 2px", lineHeight: 1.45 }}>Question 17 of 40</p>
      <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>Which gas turns lime water milky?</p>
      {option("Oxygen", false, "A")}
      {option("Carbon dioxide", true, "B")}
      {option("Nitrogen", false, "C")}
    </div>
  );

  if (type === "analytics") return (
    <div style={shell}>
      <span style={label}>Your progress</span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "6px 0 12px" }}>
        <span style={{ fontSize: 30, fontWeight: 900, color: "var(--text)", lineHeight: 1 }}>78%</span>
        <span style={{ fontSize: 10, color: "var(--success)", fontWeight: 800 }}>▲ 12% this week</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 7, height: 74 }}>
        {[38, 52, 44, 68, 61, 84, 78].map((h, i) => (
          <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: "5px 5px 2px 2px", background: i === 5 ? "var(--primary)" : "rgb(var(--primary-rgb) / 0.22)" }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 8, color: "var(--text-muted)" }}>
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div style={{ marginTop: 10, padding: "7px 9px", borderRadius: 8, background: "rgb(var(--accent-rgb) / 0.10)", border: "1px solid rgb(var(--accent-rgb) / 0.25)", fontSize: 10, color: "var(--text)" }}>
        Focus next: <strong>Organic Chemistry</strong>
      </div>
    </div>
  );

  if (type === "streak") return (
    <div style={shell}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={label}>Streak</span>
        <span style={{ fontSize: 10, color: "var(--accent)", fontWeight: 800 }}>🔥 12 days</span>
      </div>
      <div style={{ display: "flex", gap: 6, margin: "12px 0" }}>
        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
          <div key={d} style={{ flex: 1, textAlign: "center" }}>
            <div style={{
              height: 32, borderRadius: 8, display: "grid", placeItems: "center",
              background: d <= 5 ? "rgb(var(--primary-rgb) / 0.18)" : "var(--bg-2)",
              border: `1px solid ${d <= 5 ? "rgb(var(--primary-rgb) / 0.45)" : "var(--border)"}`,
              color: d <= 5 ? "var(--primary)" : "var(--text-muted)", fontSize: 12, fontWeight: 900,
            }}>{d <= 5 ? "✓" : d}</div>
            <div style={{ fontSize: 8, color: "var(--text-muted)", marginTop: 3 }}>{["M", "T", "W", "T", "F", "S", "S"][d - 1]}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {[["🏆", "Top 5%"], ["⚡", "2,480 XP"], ["🎯", "92% accuracy"]].map(([e, t]) => (
          <div key={t} style={{ flex: 1, padding: "7px 4px", borderRadius: 8, background: "var(--bg-2)", border: "1px solid var(--border)", textAlign: "center", fontSize: 9, color: "var(--text)", fontWeight: 700 }}>
            <div style={{ fontSize: 14 }}>{e}</div>{t}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={shell}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={label}>ExamPadi Pro</span>
        <span style={{ fontSize: 9, fontWeight: 900, color: "#04120D", background: "var(--accent)", padding: "3px 7px", borderRadius: 5 }}>BEST VALUE</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 900, color: "var(--text)", margin: "8px 0 2px" }}>₦2,500<span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>/month</span></div>
      <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 8 }}>Everything you need to pass first try.</div>
      {["80 AI tutor messages", "Unlimited mock exams", "Smart study plans", "Advanced analytics"].map((f) => (
        <div key={f} style={{ display: "flex", gap: 7, alignItems: "center", fontSize: 10.5, color: "var(--text)", marginTop: 5 }}>
          <span style={{ color: "var(--primary)", fontWeight: 900 }}>✓</span>{f}
        </div>
      ))}
      <div style={{ marginTop: 11, textAlign: "center", background: "var(--primary)", color: "#04120D", fontWeight: 900, fontSize: 11, padding: "8px", borderRadius: 8 }}>
        Start 7-day free trial
      </div>
    </div>
  );
}

export default function ImageCarousel({ autoPlay = true, interval = 4000 }) {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goTo = useCallback((index) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrent(index);
    setTimeout(() => setIsTransitioning(false), 500);
  }, [isTransitioning]);

  const next = useCallback(() => {
    goTo((current + 1) % slides.length);
  }, [current, goTo]);

  const prev = useCallback(() => {
    goTo((current - 1 + slides.length) % slides.length);
  }, [current, goTo]);

  useEffect(() => {
    if (!autoPlay) return;
    const timer = setInterval(next, interval);
    return () => clearInterval(timer);
  }, [autoPlay, interval, next]);

  const slide = slides[current];

  return (
    <div style={{
      position: "relative",
      width: "100%",
      maxWidth: 900,
      margin: "0 auto",
      borderRadius: 24,
      overflow: "hidden",
      boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
    }}>
      <div style={{
        background: slide.bg,
        minHeight: 520,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "36px 24px 54px",
        textAlign: "center",
        position: "relative",
        transition: "background 0.6s ease",
      }}>
        <div style={{
          position: "absolute",
          inset: 0,
          opacity: 0.1,
          background: `radial-gradient(circle at 50% 50%, ${slide.color}44 0%, transparent 70%)`,
        }} />
        <MiniPreview type={slide.type} color={slide.color} />
        <h3 style={{
          fontSize: "clamp(1.25rem, 2.5vw, 1.75rem)",
          fontWeight: 800,
          color: "var(--text)",
          margin: "20px 0 10px",
          maxWidth: 540,
          lineHeight: 1.2,
        }}>{slide.title}</h3>
        <p style={{
          fontSize: 15,
          color: "var(--text-muted)",
          maxWidth: 550,
          lineHeight: 1.65,
          margin: 0,
        }}>{slide.description}</p>
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 8,
          marginTop: 20,
        }}>
          {["JAMB", "WAEC", "NABTEB", "POST-UTME"].map((exam) => (
            <span key={exam} style={{
              padding: "6px 14px",
              borderRadius: 20,
              background: `${slide.color}22`,
              border: `1px solid ${slide.color}44`,
              color: slide.color,
              fontSize: 12,
              fontWeight: 600,
            }}>{exam}</span>
          ))}
        </div>
      </div>

      <button
        onClick={prev}
        style={{
          position: "absolute",
          left: 12,
          top: "50%",
          transform: "translateY(-50%)",
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "rgba(0,0,0,0.5)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          backdropFilter: "blur(8px)",
          zIndex: 10,
          transition: "all 0.2s",
        }}
        onMouseOver={e => { e.currentTarget.style.background = "rgba(255,255,255,0.15)" }}
        onMouseOut={e => { e.currentTarget.style.background = "rgba(0,0,0,0.5)" }}
      >
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={next}
        style={{
          position: "absolute",
          right: 12,
          top: "50%",
          transform: "translateY(-50%)",
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "rgba(0,0,0,0.5)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          backdropFilter: "blur(8px)",
          zIndex: 10,
          transition: "all 0.2s",
        }}
        onMouseOver={e => { e.currentTarget.style.background = "rgba(255,255,255,0.15)" }}
        onMouseOut={e => { e.currentTarget.style.background = "rgba(0,0,0,0.5)" }}
      >
        <ChevronRight size={20} />
      </button>

      <div style={{
        position: "absolute",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: 8,
        zIndex: 10,
      }}>
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            style={{
              width: i === current ? 28 : 8,
              height: 8,
              borderRadius: 4,
              border: "none",
              background: i === current ? slide.color : "rgba(255,255,255,0.3)",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}
