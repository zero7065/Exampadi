// Animated feature previews — code-designed "short clips" (pure SVG/CSS animation).
// Each clip is a live animated mini-UI that shows what the feature feels like.
// No external assets: crisp on every screen, zero load cost.

// ─── 1. Community chat clip: messages slide in ───
export function CommunityClip() {
  return (
    <svg viewBox="0 0 320 200" width="100%" style={{ display: "block", borderRadius: 12 }} role="img" aria-label="School community chat preview">
      <defs>
        <linearGradient id="ccGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <rect width="320" height="200" rx="12" fill="var(--bg-2)" />
      {/* header */}
      <rect x="0" y="0" width="320" height="30" rx="12" fill="var(--bg-3)" />
      <circle cx="18" cy="15" r="6" fill="var(--primary)" />
      <text x="30" y="19" fontSize="10" fontWeight="800" fill="var(--text)">School Community · 248 members</text>
      {/* incoming message */}
      <g className="cc-msg cc-msg-1">
        <rect x="12" y="44" width="180" height="34" rx="10" fill="var(--bg-3)" stroke="var(--border)" />
        <text x="22" y="58" fontSize="8" fontWeight="800" fill="var(--primary)">Amaka</text>
        <text x="22" y="70" fontSize="9" fill="var(--text)">Anyone solving Q4? I'm stuck 😅</text>
      </g>
      {/* outgoing */}
      <g className="cc-msg cc-msg-2">
        <rect x="128" y="88" width="180" height="34" rx="10" fill="url(#ccGrad)" />
        <text x="138" y="102" fontSize="8" fontWeight="800" fill="rgba(0,0,0,0.7)">You</text>
        <text x="138" y="114" fontSize="9" fill="#04120D">Use the formula v = u + at!</text>
      </g>
      {/* AI assist */}
      <g className="cc-msg cc-msg-3">
        <rect x="12" y="132" width="230" height="40" rx="10" fill="rgb(var(--accent-rgb) / 0.12)" stroke="var(--accent)" strokeOpacity="0.4" />
        <text x="22" y="146" fontSize="8" fontWeight="800" fill="var(--accent)">🤖 AI Study Assistant</text>
        <text x="22" y="158" fontSize="8.5" fill="var(--text)">Step 1: identify u, a, t. Step 2: substitute carefully.</text>
        <text x="22" y="168" fontSize="8.5" fill="var(--text)">Step 3: v = 0 + 2(5) = 10 m/s ✓</text>
      </g>
      {/* typing indicator */}
      <g className="cc-typing">
        <circle cx="20" cy="188" r="3" fill="var(--text-muted)" className="cc-dot cc-dot-1" />
        <circle cx="28" cy="188" r="3" fill="var(--text-muted)" className="cc-dot cc-dot-2" />
        <circle cx="36" cy="188" r="3" fill="var(--text-muted)" className="cc-dot cc-dot-3" />
      </g>
      <style>{`
        .cc-msg { opacity: 0; animation: ccIn 0.5s ease forwards; }
        .cc-msg-1 { animation-delay: 0.2s; }
        .cc-msg-2 { animation-delay: 1.4s; }
        .cc-msg-3 { animation-delay: 2.6s; }
        @keyframes ccIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .cc-dot { animation: ccBlink 1s infinite; }
        .cc-dot-2 { animation-delay: 0.2s; }
        .cc-dot-3 { animation-delay: 0.4s; }
        @keyframes ccBlink { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
      `}</style>
    </svg>
  );
}

// ─── 2. Chess clip: animated knight tour + pulse ───
export function ChessClip() {
  return (
    <svg viewBox="0 0 320 200" width="100%" style={{ display: "block", borderRadius: 12 }} role="img" aria-label="Chess vs AI preview">
      <rect width="320" height="200" rx="12" fill="var(--bg-2)" />
      <g transform="translate(60, 14)">
        {/* board */}
        {Array.from({ length: 64 }).map((_, i) => {
          const r = Math.floor(i / 8), c = i % 8;
          const light = (r + c) % 2 === 0;
          return <rect key={i} x={c * 20} y={r * 20} width={20} height={20} fill={light ? "#EBECD9" : "#739552"} rx={1} />;
        })}
        {/* pieces */}
        <text x="30" y="70" fontSize="18" textAnchor="middle" className="ch-piece ch-piece-1">♞</text>
        <text x="90" y="130" fontSize="18" textAnchor="middle">♟</text>
        <text x="150" y="50" fontSize="18" textAnchor="middle">♜</text>
        {/* highlight move */}
        <rect x="20" y="60" width="20" height="20" fill="rgba(255,235,59,0.45)" rx={2} className="ch-hl" />
        <rect x="20" y="100" width="20" height="20" fill="rgba(255,235,59,0.3)" rx={2} className="ch-hl ch-hl-2" />
      </g>
      {/* side panel */}
      <rect x="232" y="20" width="76" height="160" rx="10" fill="var(--bg-3)" stroke="var(--border)" />
      <text x="242" y="38" fontSize="8" fontWeight="800" fill="var(--text-muted)">LEVEL 7</text>
      <text x="242" y="54" fontSize="10" fontWeight="800" fill="var(--primary)">Expert</text>
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x="242" y={66 + i * 14} width="56" height="7" rx="3" fill="var(--bg)" stroke="var(--border)" strokeWidth="0.5" />
      ))}
      <rect x="242" y="66" width="40" height="7" rx="3" fill="var(--primary)" className="ch-bar" />
      <text x="242" y="158" fontSize="8" fill="var(--text-muted)">Checkmate wins</text>
      <text x="242" y="170" fontSize="8" fill="var(--text-muted)">earn XP + badges</text>
      <style>{`
        .ch-piece { filter: drop-shadow(0 1px 1px rgba(0,0,0,0.4)); }
        .ch-piece-1 { animation: chHop 2.4s ease-in-out infinite; }
        @keyframes chHop { 0%, 100% { transform: translate(0,0); } 40% { transform: translate(40px,-40px); } 60% { transform: translate(40px,-40px); } }
        .ch-hl { animation: chPulse 2s ease-in-out infinite; }
        .ch-hl-2 { animation-delay: 0.4s; }
        @keyframes chPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
        .ch-bar { animation: chBar 2s ease-in-out infinite; }
        @keyframes chBar { 0%, 100% { width: 40px; } 50% { width: 56px; } }
      `}</style>
    </svg>
  );
}

// ─── 3. Legend mode clip: typewriter ───
export function LegendClip() {
  return (
    <svg viewBox="0 0 320 200" width="100%" style={{ display: "block", borderRadius: 12 }} role="img" aria-label="Legend mode preview">
      <rect width="320" height="200" rx="12" fill="var(--bg-2)" />
      <rect x="0" y="0" width="320" height="30" rx="12" fill="var(--bg-3)" />
      <text x="14" y="19" fontSize="10" fontWeight="800" fill="var(--accent)">👑 Legend Mode · strict</text>
      {/* riddle card */}
      <rect x="12" y="42" width="296" height="70" rx="10" fill="rgb(var(--accent-rgb) / 0.08)" stroke="var(--accent)" strokeOpacity="0.35" />
      <text x="22" y="58" fontSize="8" fontWeight="800" fill="var(--accent)">RIDDLE · PHOTOSYNTHESIS</text>
      <text x="22" y="74" fontSize="9.5" fill="var(--text)" className="lg-line-1">I drink light and breathe air,</text>
      <text x="22" y="88" fontSize="9.5" fill="var(--text)" className="lg-line-2">I feast on water, yet never eat.</text>
      <text x="22" y="102" fontSize="9.5" fill="var(--text)" className="lg-line-3">What am I? (Think like a leaf.)</text>
      {/* answer */}
      <rect x="12" y="120" width="296" height="44" rx="10" fill="var(--bg-3)" stroke="var(--success)" strokeOpacity="0.4" className="lg-answer" />
      <text x="22" y="136" fontSize="8" fontWeight="800" fill="var(--success)">ANSWER</text>
      <text x="22" y="150" fontSize="9" fill="var(--text)">A chloroplast — the leaf's solar kitchen.</text>
      <text x="22" y="160" fontSize="8" fill="var(--text-muted)">Metaphor: it cooks glucose from sunlight.</text>
      <style>{`
        .lg-line-1, .lg-line-2, .lg-line-3 { opacity: 0; animation: lgType 0.05s steps(1) forwards; }
        .lg-line-1 { animation-delay: 0.3s; }
        .lg-line-2 { animation-delay: 1.1s; }
        .lg-line-3 { animation-delay: 1.9s; }
        @keyframes lgType { to { opacity: 1; } }
        .lg-answer { opacity: 0; animation: lgIn 0.5s ease 2.9s forwards; }
        @keyframes lgIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </svg>
  );
}

// ─── 4. Games clip: bouncing cards ───
export function GamesClip() {
  return (
    <svg viewBox="0 0 320 200" width="100%" style={{ display: "block", borderRadius: 12 }} role="img" aria-label="Games preview">
      <rect width="320" height="200" rx="12" fill="var(--bg-2)" />
      <text x="14" y="24" fontSize="10" fontWeight="800" fill="var(--text)">Games & Brain Training</text>
      {[
        { x: 14, emoji: "🧠", label: "Trivia", c: "var(--primary)" },
        { x: 118, emoji: "💡", label: "Teasers", c: "var(--accent)" },
        { x: 222, emoji: "♟️", label: "Chess", c: "var(--success)" },
      ].map((g, i) => (
        <g key={i} className={`gm-card gm-card-${i + 1}`}>
          <rect x={g.x} y="40" width="84" height="90" rx="12" fill="var(--bg-3)" stroke={g.c} strokeOpacity="0.4" />
          <text x={g.x + 42} y="76" fontSize="24" textAnchor="middle">{g.emoji}</text>
          <text x={g.x + 42} y="96" fontSize="9" fontWeight="800" textAnchor="middle" fill={g.c}>{g.label}</text>
          <text x={g.x + 42} y="112" fontSize="7.5" textAnchor="middle" fill="var(--text-muted)">Play →</text>
        </g>
      ))}
      {/* streak */}
      <text x="14" y="156" fontSize="9" fontWeight="800" fill="var(--text)">🔥 7-day win streak</text>
      <rect x="14" y="164" width="120" height="8" rx="4" fill="var(--bg-3)" />
      <rect x="14" y="164" width="70" height="8" rx="4" fill="var(--success)" className="gm-streak" />
      <text x="146" y="172" fontSize="8" fill="var(--text-muted)">keep it alive for 2x XP</text>
      <style>{`
        .gm-card { animation: gmFloat 3s ease-in-out infinite; }
        .gm-card-2 { animation-delay: 0.4s; }
        .gm-card-3 { animation-delay: 0.8s; }
        @keyframes gmFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        .gm-streak { animation: gmStreak 2.5s ease-in-out infinite; }
        @keyframes gmStreak { 0%, 100% { width: 70px; } 50% { width: 96px; } }
      `}</style>
    </svg>
  );
}

export const FEATURE_CLIPS = [
  { id: "community", label: "School Community", clip: CommunityClip, desc: "Private group chats with AI assist" },
  { id: "chess", label: "Chess vs AI", clip: ChessClip, desc: "10 levels, real rules, achievements" },
  { id: "legend", label: "Legend Mode", clip: LegendClip, desc: "Riddles, metaphors, poems, hacks" },
  { id: "games", label: "Brain Games", clip: GamesClip, desc: "Trivia, teasers, patterns" },
];