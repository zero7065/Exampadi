// ShareButton — share a question / teaser / chess challenge to WhatsApp (or any
// app). Creates a public shareable item and opens the share sheet.
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "./Toast";
import { createSharedItem, shareItemLink } from "../lib/friendShare";
import { Share2, Loader2 } from "lucide-react";

export default function ShareButton({ type = "question", title, body, options, answer, extra, label = "Share", className = "btn-secondary", compact = false }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  async function handleShare(e) {
    e?.stopPropagation?.();
    if (!user) {
      toast({ message: "Sign in to share a challenge with friends", type: "info" });
      return;
    }
    setBusy(true);
    try {
      const id = await createSharedItem({
        sharerUid: user.uid,
        sharerName: user.displayName || "A friend",
        type,
        title,
        body,
        options,
        answer,
        extra,
      });
      const link = shareItemLink(id);
      const text = `Can you solve this ${type} on ExamPadi? 🎯\n\n${title ? title.slice(0, 120) + "\n\n" : ""}${link}`;
      if (navigator.share) {
        try {
          await navigator.share({ title: "ExamPadi challenge", text, url: link });
          setBusy(false);
          return;
        } catch { /* user cancelled — fall through to WhatsApp */ }
      }
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
      toast({ message: "Share link ready ✓", type: "success" });
    } catch (err) {
      toast({ message: err.message || "Could not share", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={handleShare} disabled={busy} className={`${className} inline-flex items-center gap-1.5`} title="Share to WhatsApp or any app">
      {busy ? <Loader2 size={compact ? 12 : 14} className="animate-spin" /> : <Share2 size={compact ? 12 : 14} />}
      {label && <span>{label}</span>}
    </button>
  );
}