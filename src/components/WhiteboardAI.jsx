import { useState } from "react";
import { Sparkles, Loader2, Send } from "lucide-react";
import { askGroqVision } from "../lib/ai";

export default function WhiteboardAI({ imageBase64, onClose }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  async function analyze() {
    if (!imageBase64) return;
    setLoading(true);
    setAnalysis(null);
    try {
      const system = "You are ExamPadi, an expert Nigerian exam tutor. Analyze the student's whiteboard work shown in the image. Identify: 1) What they did correctly, 2) What they did wrong, 3) Step-by-step correct approach, 4) A comparison showing the difference between their method and the correct method. Be encouraging and specific. Use simple language.";
      const result = await askGroqVision({
        systemPrompt: system,
        messages: [{ role: "user", content: prompt || "Analyze this whiteboard work" }],
        imageBase64,
        maxTokens: 800,
      });
      setAnalysis(result);
    } catch (e) {
      setAnalysis("AI analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div className="glass-card" style={{ position: "relative", width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ color: "var(--text)", fontSize: 18, fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={20} color="var(--primary)" /> AI Whiteboard Analysis
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>

        {imageBase64 && (
          <div style={{ marginBottom: 16, textAlign: "center" }}>
            <img src={imageBase64} alt="Whiteboard" style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8, border: "1px solid #333" }} />
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask about this work (optional)…"
            style={{ flex: 1, padding: "10px 14px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid #333", color: "var(--text)", fontSize: 13, outline: "none" }}
          />
          <button onClick={analyze} disabled={loading || !imageBase64} style={{ padding: "10px 20px", borderRadius: 8, background: "var(--primary)", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, opacity: loading || !imageBase64 ? 0.6 : 1 }}>
            {loading ? <Loader2 size={14} /> : <Send size={14} />} Analyze
          </button>
        </div>

        {analysis && (
          <div style={{ padding: 16, borderRadius: 10, background: "rgb(var(--primary-rgb) / 0.08)", border: "1px solid rgb(var(--primary-rgb) / 0.2)", whiteSpace: "pre-wrap", color: "var(--text)", fontSize: 14, lineHeight: 1.7 }}>
            {analysis}
          </div>
        )}

        {!analysis && !loading && (
          <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", margin: 0 }}>
            Draw on the whiteboard, then click "Analyze" to get AI feedback on your work.
          </p>
        )}
      </div>
    </div>
  );
}
