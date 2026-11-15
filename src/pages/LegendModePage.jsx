// LegendMode — learn any topic through riddles, metaphors, poems, stories, hacks.
// Adjustable strictness (gentle/balanced/strict). AI-generated, real content.
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { useSubscription } from "../hooks/useSubscription";
import ProGate from "../components/ProGate";
import { generateLearningContent, CONTENT_STYLES } from "../lib/ai";
import { JAMB_SUBJECTS } from "../data/subjects";
import { ArrowLeft, Sparkles, Loader2, Crown, ChevronRight } from "lucide-react";

const STRICTNESS = [
  { id: "gentle", label: "Gentle", desc: "Encouraging & simple" },
  { id: "balanced", label: "Balanced", desc: "Clear & direct" },
  { id: "strict", label: "Strict", desc: "Legend mode — rigorous" },
];

export default function LegendModePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isPro } = useSubscription();
  const [style, setStyle] = useState("riddle");
  const [topic, setTopic] = useState("");
  const [exam, setExam] = useState("JAMB");
  const [strictness, setStrictness] = useState("balanced");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate() {
    if (!topic.trim()) {
      toast({ message: "Enter a topic to learn", type: "warning" });
      return;
    }
    setLoading(true);
    setResult("");
    try {
      const text = await generateLearningContent({ style, topic: topic.trim(), exam, strictness });
      setResult(String(text || "No content generated."));
    } catch (e) {
      toast({ message: e.message || "Generation failed", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  if (!isPro) {
    return (
      <div className="page-content max-w-2xl mx-auto">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-semibold mb-4" style={{ color: "var(--text-muted)" }}><ArrowLeft size={16} /> Dashboard</Link>
        <ProGate feature="Legend Mode"><div style={{ height: 300 }} /></ProGate>
      </div>
    );
  }

  return (
    <div className="page-content max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Link to="/dashboard" className="p-2 rounded-lg hover:bg-subtle" aria-label="Back"><ArrowLeft size={18} /></Link>
        <h1 className="text-xl font-black flex items-center gap-2"><Crown size={18} className="text-amber-500" /> Legend Mode</h1>
      </div>
      <p className="text-sm text-text-muted">Learn any topic in a style that sticks — riddles, metaphors, poems, stories or hacks. Adjust the strictness to match your mood.</p>

      {/* Style picker */}
      <div className="grid grid-cols-4 gap-2">
        {CONTENT_STYLES.map((s) => (
          <button
            key={s.id}
            onClick={() => setStyle(s.id)}
            className="glass-card p-3 text-center transition-all"
            style={{ borderColor: style === s.id ? "var(--primary)" : "var(--border)", background: style === s.id ? "rgb(var(--primary-rgb) / 0.08)" : "var(--bg-2)" }}
          >
            <div className="text-xl mb-1">{s.icon}</div>
            <div className="text-xs font-bold text-text">{s.label}</div>
            <div className="text-[10px] text-text-muted">{s.desc}</div>
          </button>
        ))}
      </div>

      {/* Inputs */}
      <div className="glass-card p-4 space-y-3">
        <div className="grid sm:grid-cols-[1fr_140px] gap-2">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
            placeholder="Topic (e.g. Photosynthesis, Quadratic equations, French Revolution)"
            className="input-field"
          />
          <select value={exam} onChange={(e) => setExam(e.target.value)} className="input-field">
            {["JAMB", "WAEC", "NECO", "NABTEB", "POST-UTME", "IELTS", "SAT"].map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>

        {/* Strictness */}
        <div>
          <label className="text-xs font-bold text-text-muted mb-1 block">Strictness</label>
          <div className="flex gap-2">
            {STRICTNESS.map((s) => (
              <button key={s.id} onClick={() => setStrictness(s.id)}
                className="flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-colors"
                style={{
                  background: strictness === s.id ? (s.id === "strict" ? "rgba(239,68,68,0.15)" : "rgb(var(--primary-rgb) / 0.15)") : "var(--bg-3)",
                  color: strictness === s.id ? (s.id === "strict" ? "#EF4444" : "var(--primary)") : "var(--text-muted)",
                  border: `1px solid ${strictness === s.id ? (s.id === "strict" ? "#EF4444" : "var(--primary)") : "var(--border)"}`,
                }}>
                {s.label} <span className="font-normal opacity-70">· {s.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <button onClick={generate} disabled={loading} className="btn-primary w-full py-3">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {loading ? "Generating…" : `Generate ${CONTENT_STYLES.find((s) => s.id === style)?.label}`}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="glass-card p-5 animate-fade" style={{ borderColor: "rgb(var(--primary-rgb) / 0.4)" }}>
          <div className="text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-1" style={{ color: "var(--primary)" }}>
            <Sparkles size={12} /> {CONTENT_STYLES.find((s) => s.id === style)?.label} · {strictness}
          </div>
          <div className="text-sm text-text whitespace-pre-wrap" style={{ lineHeight: 1.7 }}>{result}</div>
        </div>
      )}
    </div>
  );
}