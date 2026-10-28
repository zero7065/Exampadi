// GuideAssistant â€” "tell me your issue, I'll take you there."
// Layer 1 (instant, free, offline): local intent match â†’ steps + deep links.
// Layer 2 (AI, counts against daily AI limit): organized plan from askGuide.
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "./Toast";
import { useSubscription } from "../hooks/useSubscription";
import { matchGuideRoutes, askGuide, getAIErrorIfRecent } from "../lib/ai";
import { checkAILimit } from "../lib/usageTracker";
import { getUserProfile } from "../lib/userProfile";
import { Compass, Sparkles, Loader2, ArrowRight, MapPin } from "lucide-react";

const QUICK_TASKS = [
  { label: "I want to practice", to: "/select" },
  { label: "Take a mock exam", to: "/mock-exam" },
  { label: "Ask the AI Tutor", to: "/ai-tutor" },
  { label: "Make a study plan", to: "/study-plan" },
  { label: "See my weak topics", to: "/mastery" },
  { label: "Pay for a team", to: "/payment" },
  { label: "Upgrade to Pro", to: "/payment" },
];

export default function GuideAssistant({ compact = false, onNavigate }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isPro } = useSubscription();
  const [issue, setIssue] = useState("");
  const [matched, setMatched] = useState(null);
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  function handleGuide() {
    if (!issue.trim()) {
      toast({ message: "Describe your issue first â€” e.g. 'I want to practice physics'", type: "info" });
      return;
    }
    const routes = matchGuideRoutes(issue);
    setAiAnswer("");
    if (routes.length === 0) {
      setMatched([]);
      toast({ message: "No exact match â€” try 'Ask AI' below for a custom plan", type: "info" });
      return;
    }
    setMatched(routes);
  }

  async function handleAskAI() {
    if (!issue.trim()) {
      toast({ message: "Describe your issue first", type: "info" });
      return;
    }
    setAiLoading(true);
    setAiAnswer("");
    try {
      if (!isPro && user) {
        const limit = await checkAILimit(user.uid);
        if (!limit.allowed) {
          toast({ message: `AI limit reached. Upgrade to Pro â€” the instant guide above is still free!`, type: "warning" });
          return;
        }
      }
      let profile = null;
      if (user) {
        try { profile = await getUserProfile(user.uid); } catch { /* profile optional for guide */ }
      }
      const answer = await askGuide(issue.trim(), profile);
      const aiErr = getAIErrorIfRecent();
      if (aiErr) {
        toast({ message: `Guide AI failed: ${aiErr.message}`, type: "error" });
        return;
      }
      setAiAnswer(answer);
      // Refresh local matches too so buttons accompany the AI plan
      setMatched(matchGuideRoutes(issue));
    } catch (e) {
      if (e?.code === "AI_LIMIT") toast({ message: e.message, type: "warning" });
      else toast({ message: "Guide failed â€” check your connection", type: "error" });
    } finally {
      setAiLoading(false);
    }
  }

  function go() {
    if (onNavigate) onNavigate();
  }

  return (
    <div className={compact ? "" : "glass-card p-6 md:p-8"} style={compact ? {} : { borderColor: "rgb(var(--primary-rgb) / 0.35)" }}>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-ash-900 shrink-0" style={{ background: "var(--landing-gradient)" }}>
          <Compass size={22} />
        </div>
        <div>
          <h2 className="text-xl font-black text-text">Tell me your issue â€” I'll take you there</h2>
          <p className="text-sm text-text-muted">New here? Say what you want in plain words. Instant guide is free; AI plan uses 1 AI message.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mt-4">
        <input
          value={issue}
          onChange={(e) => setIssue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleGuide()}
          placeholder='e.g. "I keep failing physics" or "how do I pay for Pro?"'
          className="input-field flex-1"
        />
        <div className="flex gap-2">
          <button onClick={handleGuide} className="btn-secondary px-5 whitespace-nowrap">
            <MapPin size={15} /> Guide me
          </button>
          <button onClick={handleAskAI} disabled={aiLoading} className="btn-primary px-5 whitespace-nowrap disabled:opacity-60">
            {aiLoading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {aiLoading ? "Thinkingâ€¦" : "Ask AI"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {QUICK_TASKS.map((t) => (
          <Link key={t.label} to={t.to} onClick={go} className="text-xs font-semibold px-3 py-2 rounded-full border border-border text-text-muted hover:text-primary hover:border-primary/50 transition-colors">
            {t.label}
          </Link>
        ))}
      </div>

      {matched && matched.length > 0 && (
        <div className="mt-5 space-y-2 animate-fade">
          <div className="text-sm font-bold text-text">Here's where to go, in order:</div>
          {matched.map((r, i) => (
            <Link key={r.path} to={r.path} onClick={go} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/50 transition-colors group">
              <span className="w-7 h-7 rounded-full bg-primary text-ash-900 text-xs font-black flex items-center justify-center shrink-0">{i + 1}</span>
              <span className="font-bold text-text text-sm flex-1">{r.label}</span>
              <ArrowRight size={15} className="text-text-muted group-hover:text-primary transition-colors" />
            </Link>
          ))}
        </div>
      )}

      {matched && matched.length === 0 && !aiAnswer && (
        <div className="mt-5 text-sm text-text-muted">
          I couldn't match that to a page. Try different words â€” or tap <strong>Ask AI</strong> for a custom plan, or <Link to="/contact" onClick={go} className="text-primary font-semibold">talk to a human</Link>.
        </div>
      )}

      {aiAnswer && (
        <div className="mt-5 p-4 rounded-xl border border-primary/30 animate-fade" style={{ background: "var(--primary-dim)" }}>
          <div className="text-xs font-black uppercase tracking-widest text-primary mb-2 flex items-center gap-1">
            <Sparkles size={12} /> Your organized plan
          </div>
          <div className="text-sm text-text whitespace-pre-wrap" style={{ lineHeight: 1.7 }}>{aiAnswer}</div>
        </div>
      )}
    </div>
  );
}

