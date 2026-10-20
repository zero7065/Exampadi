// MessageBubble — user right-aligned (primary-soft), AI left-aligned (card).
// AI messages get copy-to-clipboard; user image messages show a thumbnail.
import { useState } from "react";
import { Check, Copy, Sparkles } from "lucide-react";

export default function MessageBubble({ message, onGenerateImage }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const imgs = Array.isArray(message.images)
    ? message.images
    : message.image
      ? [message.image]
      : [];

  async function copy() {
    try {
      await navigator.clipboard.writeText(message.content || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable — ignore */ }
  }

  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 16 }}>
      {!isUser && (
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, marginRight: 8, flexShrink: 0, color: "#fff" }}>E</div>
      )}
      <div style={{
        maxWidth: "78%",
        padding: "12px 16px",
        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        background: isUser ? "var(--primary)" : "var(--bg-2)",
        border: isUser ? "none" : "1px solid var(--border)",
      }}>
        {imgs.length > 0 && (
          <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
            {imgs.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`Uploaded ${i + 1}`}
                style={{ maxWidth: imgs.length > 1 ? "48%" : "100%", maxHeight: 180, borderRadius: 10, display: "block", objectFit: "cover" }}
              />
            ))}
          </div>
        )}
        <div style={{ fontSize: 14, color: isUser ? "#fff" : "var(--text)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
          {message.content}
        </div>
        {!isUser && message.pendingImage && onGenerateImage && (
          <button
            onClick={() => onGenerateImage(message.pendingImage.prompt)}
            style={{ marginTop: 10, padding: "8px 14px", borderRadius: 8, background: "var(--primary)", border: "none", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}
          >
            <Sparkles size={13} /> Review &amp; generate image
          </button>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          {!isUser && (
            <button
              onClick={copy}
              title="Copy answer"
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", padding: 2 }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          )}
          <span style={{ fontSize: 10, color: isUser ? "rgba(255,255,255,0.6)" : "var(--text-muted)" }}>
            {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
