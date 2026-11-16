// src/components/AdminBranding.jsx — Admin UI to customize site branding,
// contact details, background image, and reset admin login.
import { useState, useEffect } from "react";
import { Image, Mail, Phone, Send, User, Loader2, Save, AlertTriangle } from "lucide-react";
import { loadBranding, saveBranding, BACKGROUND_PRESETS } from "../lib/branding";
import { auth, sendPasswordResetEmail } from "../firebaseConfig";
import { useToast } from "./Toast";

export default function AdminBranding() {
  const { toast } = useToast();
  const [branding, setBranding] = useState({ ...DEFAULT_BRANDING });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSaving, setResetSaving] = useState(false);

  useEffect(() => {
    loadBranding().then(setBranding).finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      await saveBranding(branding);
      toast({ message: "Branding saved", type: "success" });
    } catch (e) {
      toast({ message: e.message, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!resetEmail) return;
    setResetSaving(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast({ message: `Reset link sent to ${resetEmail}`, type: "success" });
    } catch (e) {
      toast({ message: e.message, type: "error" });
    } finally {
      setResetSaving(false);
    }
  }

  if (loading) return <div style={{ color: "var(--text-muted)", padding: 24 }}>Loading branding…</div>;

  return (
    <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <Image size={18} color="var(--primary)" />
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>Brand & Customization</span>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8 }}>
          <User size={12} style={{ display: "inline", marginRight: 4 }} /> Site Name
        </label>
        <input
          value={branding.siteName}
          onChange={(e) => setBranding({ ...branding, siteName: e.target.value })}
          placeholder="ExamPadi"
          style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid #333", color: "#fff", fontSize: 13, outline: "none" }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8 }}>Tagline</label>
        <input
          value={branding.tagline}
          onChange={(e) => setBranding({ ...branding, tagline: e.target.value })}
          placeholder="Pass JAMB, WAEC & NABTEB First Try"
          style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid #333", color: "#fff", fontSize: 13, outline: "none" }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8 }}>
          <Image size={12} style={{ display: "inline", marginRight: 4 }} /> Background Theme
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 10 }}>
          {Object.entries(BACKGROUND_PRESETS).map(([key, css]) => (
            <button
              key={key}
              type="button"
              onClick={() => setBranding({ ...branding, backgroundPreset: branding.backgroundPreset === key ? "" : key })}
              title={key}
              style={{
                height: 48, borderRadius: 10, cursor: "pointer", position: "relative",
                background: css, border: branding.backgroundPreset === key ? "2px solid var(--primary)" : "1px solid var(--border)",
                overflow: "hidden",
              }}
            >
              <span style={{ position: "absolute", bottom: 3, left: 0, right: 0, fontSize: 9, fontWeight: 800, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.8)", textTransform: "capitalize" }}>{key}</span>
            </button>
          ))}
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: 11, margin: "0 0 8px" }}>Pick a ready-made theme, or paste a custom image URL below. Theme wins over URL.</p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8 }}>
          <Image size={12} style={{ display: "inline", marginRight: 4 }} /> Background Image URL
        </label>
        <input
          value={branding.backgroundImageUrl}
          onChange={(e) => setBranding({ ...branding, backgroundImageUrl: e.target.value })}
          placeholder="https://example.com/bg.jpg"
          style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid #333", color: "#fff", fontSize: 13, outline: "none" }}
        />
        <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>Paste any public image URL (max upload size 50MB). Applied to the sign-in page shell.</p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8 }}>
          <Send size={12} style={{ display: "inline", marginRight: 4 }} /> Footer Text
        </label>
        <input
          value={branding.footerText}
          onChange={(e) => setBranding({ ...branding, footerText: e.target.value })}
          placeholder="Developed by Jadai Studios"
          style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid #333", color: "#fff", fontSize: 13, outline: "none" }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8 }}>
          <Mail size={12} style={{ display: "inline", marginRight: 4 }} /> Contact Email
        </label>
        <input
          value={branding.contactEmail}
          onChange={(e) => setBranding({ ...branding, contactEmail: e.target.value })}
          placeholder="jadei7065@gmail.com"
          style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid #333", color: "#fff", fontSize: 13, outline: "none" }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8 }}>
          <Phone size={12} style={{ display: "inline", marginRight: 4 }} /> Contact Phone / WhatsApp
        </label>
        <input
          value={branding.contactPhone}
          onChange={(e) => setBranding({ ...branding, contactPhone: e.target.value })}
          placeholder="+234 812 763 6057"
          style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid #333", color: "#fff", fontSize: 13, outline: "none" }}
        />
      </div>

      <div style={{ marginBottom: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8 }}>
          <AlertTriangle size={12} style={{ display: "inline", marginRight: 4 }} /> Reset Admin Login
        </label>
        <p style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 8 }}>
          Sends a Firebase password-reset email to the admin account below. Use this if you forget the admin password.
        </p>
        <input
          value={resetEmail}
          onChange={(e) => setResetEmail(e.target.value)}
          placeholder="jadai7065@gmail.com"
          style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid #333", color: "#fff", fontSize: 13, outline: "none", marginBottom: 8 }}
        />
        <button
          onClick={handleReset}
          disabled={resetSaving}
          style={{ width: "100%", padding: "12px", borderRadius: 8, background: "var(--primary)", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: resetSaving ? "not-allowed" : "pointer", opacity: resetSaving ? 0.6 : 1 }}
        >
          {resetSaving ? <Loader2 size={16} /> : <Send size={16} />}
          {resetSaving ? "Sending…" : "Send Reset Email"}
        </button>
      </div>

      <button
        onClick={save}
        disabled={saving}
        style={{ marginTop: 16, padding: "12px 24px", borderRadius: 8, background: "var(--primary)", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}
      >
        {saving ? <Loader2 size={16} /> : <Save size={16} />}
        {saving ? "Saving…" : "Save Branding"}
      </button>
    </div>
  );
}

const DEFAULT_BRANDING = {
  siteName: "ExamPadi",
  tagline: "Pass JAMB, WAEC & NABTEB First Try",
  backgroundImageUrl: "",
  backgroundPreset: "",
  footerText: "Developed by Jadai Studios",
  contactEmail: "jadai7065@gmail.com",
  contactPhone: "+234 812 763 6057",
  contactWhatsApp: "https://wa.me/2348127636057",
  supportWhatsApp: "+234 812 763 6057",
};
