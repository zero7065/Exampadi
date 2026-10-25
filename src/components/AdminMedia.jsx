// AdminMedia — manage landing page images (hero + 4 screenshots).
// Uploads to Firebase Storage (landing/...) and stores public URLs in
// Firestore siteContent/landing. "Revert" clears the URL so the landing
// falls back to the bundled screenshot, then the code-drawn mockup.
import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, getAppStorage } from "../firebaseConfig";
import { LANDING_SLOTS, BUNDLED_SHOTS } from "../lib/landingMedia";
import { useToast } from "./Toast";
import { ImagePlus, RotateCcw, Loader2, ExternalLink } from "lucide-react";

const SLOT_LABELS = {
  hero: "Hero phone shot",
  practice: "Practice screen",
  cbt: "Exam Mode screen",
  dashboard: "Dashboard screen",
  aiTutor: "AI Tutor screen",
};

function downscaleImage(file, maxDim = 800, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Could not process image"))),
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image file"));
    };
    img.src = url;
  });
}

export default function AdminMedia() {
  const { toast } = useToast();
  const [urls, setUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState({});


  useEffect(() => {
    let cancelled = false;
    async function loadMedia() {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "siteContent", "landing"));
        if (!cancelled) setUrls(snap.exists() ? snap.data() || {} : {});
      } catch (e) {
        if (!cancelled) toast({ message: `Failed to load media: ${e.message}`, type: "error" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadMedia();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleUpload(slot, file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ message: "Please choose an image file", type: "warning" });
      return;
    }
    setUploading((u) => ({ ...u, [slot]: true }));
    try {
      const blob = await downscaleImage(file);
      if (blob.size > 400 * 1024) {
        toast({ message: "Image still large after compression — try a smaller file", type: "warning" });
      }
      const storage = getAppStorage();
      const path = `landing/${slot}-${crypto.randomUUID()}.jpg`;
      await uploadBytes(ref(storage, path), blob, { contentType: "image/jpeg" });
      const url = await getDownloadURL(ref(storage, path));
      await setDoc(doc(db, "siteContent", "landing"), { [slot]: url, updatedAt: serverTimestamp() }, { merge: true });
      setUrls((prev) => ({ ...prev, [slot]: url }));
      try {
        localStorage.removeItem("exampadi_landing_media");
      } catch { /* intentionally empty */ }
      toast({ message: `${SLOT_LABELS[slot]} updated ✓`, type: "success" });
    } catch (e) {
      toast({ message: `Upload failed: ${e.message}`, type: "error" });
    } finally {
      setUploading((u) => ({ ...u, [slot]: false }));
    }
  }

  async function handleRevert(slot) {
    try {
      const next = { ...urls };
      delete next[slot];
      await setDoc(doc(db, "siteContent", "landing"), { [slot]: null, updatedAt: serverTimestamp() }, { merge: true });
      setUrls(next);
      try {
        localStorage.removeItem("exampadi_landing_media");
      } catch { /* intentionally empty */ }
      toast({ message: `${SLOT_LABELS[slot]} reverted to bundled image`, type: "success" });
    } catch (e) {
      toast({ message: `Revert failed: ${e.message}`, type: "error" });
    }
  }

  if (loading) {
    return <div style={{ color: "var(--text-muted)", padding: 24 }}>Loading landing media…</div>;
  }

  return (
    <div>
      <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "0 0 16px", lineHeight: 1.6 }}>
        Upload landing page images. Each slot falls back automatically:
        your upload → bundled screenshot → code-drawn mockup.
        Images are compressed to ≤800px JPEG on upload.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        {LANDING_SLOTS.map((slot) => (
          <div key={slot} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{SLOT_LABELS[slot]}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>
              {urls[slot] ? "Custom upload active" : `Bundled: ${BUNDLED_SHOTS[slot]}`}
            </div>
            <div style={{
              width: "100%", aspectRatio: "9/16", maxHeight: 220, borderRadius: 10,
              background: "var(--bg)", border: "1px solid var(--border)", overflow: "hidden",
              display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12,
            }}>
              {(urls[slot] || BUNDLED_SHOTS[slot]) ? (
                <img
                  src={urls[slot] || BUNDLED_SHOTS[slot]}
                  alt={SLOT_LABELS[slot]}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              ) : (
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>No image</span>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <label style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "10px", borderRadius: 10, background: "var(--primary)", color: "#fff",
                fontWeight: 700, fontSize: 12, cursor: "pointer",
              }}>
                {uploading[slot] ? <Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} /> : <ImagePlus size={14} />}
                {uploading[slot] ? "Uploading…" : "Upload"}
                <input
                  type="file"
                  accept="image/*"
                  disabled={!!uploading[slot]}
                  style={{ display: "none" }}
                  onChange={(e) => { handleUpload(slot, e.target.files?.[0]); e.target.value = ""; }}
                />
              </label>
              {urls[slot] && (
                <button
                  onClick={() => handleRevert(slot)}
                  title="Revert to bundled image"
                  style={{
                    padding: "10px 12px", borderRadius: 10, background: "var(--bg-3)",
                    border: "1px solid #333", color: "var(--text-muted)", cursor: "pointer",
                    display: "flex", alignItems: "center",
                  }}
                >
                  <RotateCcw size={14} />
                </button>
              )}
              {urls[slot] && (
                <a
                  href={urls[slot]}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open full image"
                  style={{
                    padding: "10px 12px", borderRadius: 10, background: "var(--bg-3)",
                    border: "1px solid #333", color: "var(--text-muted)",
                    display: "flex", alignItems: "center",
                  }}
                >
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
