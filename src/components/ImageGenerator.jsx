import { useEffect, useState } from "react";
import { Image as ImageIcon, Loader2, Sparkles, Download, CheckCircle2, AlertCircle, ShieldCheck, Pencil } from "lucide-react";
import { IMAGE_PROVIDERS, proposeImagePrompt, generateImage, verifyImage } from "../lib/imageGen";

export default function ImageGenerator({ onClose, initialPrompt = "" }) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [provider, setProvider] = useState("auto");
  const [step, setStep] = useState("input");
  const [preparing, setPreparing] = useState(false);
  const [brief, setBrief] = useState("");
  const [imageUrl, setImageUrl] = useState(null);
  const [usedProvider, setUsedProvider] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialPrompt) setPrompt(initialPrompt);
  }, [initialPrompt]);

  async function prepare() {
    if (!prompt.trim() || preparing) return;
    setPreparing(true);
    setError(null);
    try {
      const proposed = await proposeImagePrompt(prompt.trim());
      setBrief(proposed);
      setStep("confirm");
    } catch (e) {
      setError(e.message || "Could not prepare that prompt.");
    } finally {
      setPreparing(false);
    }
  }

  async function confirmGenerate() {
    setStep("generating");
    setError(null);
    setImageUrl(null);
    setVerification(null);
    try {
      const result = await generateImage({ prompt: brief, provider });
      setImageUrl(result.image);
      setUsedProvider(result.provider);
      setStep("done");
      setVerifying(true);
      const check = await verifyImage({ imageUrl: result.image, prompt: brief });
      setVerification(check);
    } catch (e) {
      setError(e.message || "Could not generate an image right now. Please try again.");
      setStep("confirm");
    } finally {
      setVerifying(false);
    }
  }

  function editPrompt() {
    setStep("input");
    setBrief("");
    setImageUrl(null);
    setVerification(null);
    setError(null);
  }

  async function download() {
    if (!imageUrl) return;
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const ext = blob.type.includes("png") ? "png" : "jpg";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `exampadi-diagram.${ext}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch {
      window.open(imageUrl, "_blank", "noopener");
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div className="glass-card" style={{ position: "relative", width: "100%", maxWidth: 580, maxHeight: "90vh", overflowY: "auto", padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ color: "var(--text)", fontSize: 18, fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <ImageIcon size={20} style={{ color: "var(--primary)" }} /> AI Image Generator
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>

        {error && (
          <div style={{ padding: 12, borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontSize: 13, marginBottom: 16, display: "flex", gap: 8, alignItems: "flex-start" }}>
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> <span>{error}</span>
          </div>
        )}

        {step === "input" && (
          <>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); prepare(); } }}
              placeholder="Describe the image you need (e.g., labelled diagram of a plant cell)…"
              rows={3}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 13, outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <select value={provider} onChange={(e) => setProvider(e.target.value)} style={{ flex: 1, minWidth: 200, padding: "10px 12px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 13 }}>
                {IMAGE_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
              <button onClick={prepare} disabled={preparing || !prompt.trim()} style={{ padding: "10px 20px", borderRadius: 8, background: "var(--primary)", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: preparing || !prompt.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, opacity: preparing || !prompt.trim() ? 0.6 : 1 }}>
                {preparing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Preview prompt
              </button>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 10, lineHeight: 1.5 }}>
              I'll show you the exact prompt first — nothing is generated until you confirm.
            </p>
          </>
        )}

        {step === "confirm" && (
          <>
            <div style={{ padding: 14, borderRadius: 10, background: "var(--bg-3)", border: "1px solid var(--border)", marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Image brief</div>
              <div style={{ color: "var(--text)", fontSize: 13, lineHeight: 1.6 }}>{brief}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={confirmGenerate} style={{ flex: 1, padding: "12px", borderRadius: 8, background: "var(--primary)", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Sparkles size={14} /> Confirm &amp; generate
              </button>
              <button onClick={editPrompt} style={{ padding: "12px 18px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text)", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <Pencil size={14} /> Edit
              </button>
            </div>
          </>
        )}

        {step === "generating" && (
          <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            <Loader2 size={24} className="animate-spin" style={{ margin: "0 auto 10px", color: "var(--primary)" }} />
            Drawing your approved image… this takes 10–40 seconds.
          </div>
        )}

        {step === "done" && imageUrl && (
          <div style={{ textAlign: "center" }}>
            <img src={imageUrl} alt="Generated illustration" style={{ maxWidth: "100%", borderRadius: 8, border: "1px solid var(--border)", display: "block", margin: "0 auto 12px" }} />
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--text-muted)", background: "var(--bg-3)", border: "1px solid var(--border)", padding: "4px 10px", borderRadius: 20, marginBottom: 12 }}>
              <ShieldCheck size={12} /> {usedProvider === "pollinations" ? "Pollinations (keyless)" : usedProvider === "gemini" ? "Google Gemini" : "Hugging Face"}
            </div>

            <div style={{ textAlign: "left", padding: 12, borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-3)", marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                {verifying ? <Loader2 size={12} className="animate-spin" /> : verification?.ok ? <CheckCircle2 size={12} color="#4ADE80" /> : <AlertCircle size={12} color="var(--accent)" />}
                Output verification
              </div>
              <div style={{ color: "var(--text)", fontSize: 12.5, lineHeight: 1.6 }}>
                {verifying ? "Checking the image against your approved prompt…" : verification?.note || "No verification result."}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={download} style={{ padding: "10px 20px", borderRadius: 8, background: "var(--success, #4ADE80)", border: "none", color: "#000", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Download size={14} /> Download
              </button>
              <button onClick={confirmGenerate} style={{ padding: "10px 20px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                Generate another
              </button>
              <button onClick={editPrompt} style={{ padding: "10px 20px", borderRadius: 8, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                Edit prompt
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
