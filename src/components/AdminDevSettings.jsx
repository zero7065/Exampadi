import { useState, useEffect } from "react";
import { Settings, Key, Shield, AlertTriangle, Save, Loader2 } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

const SETTINGS_DOC = "siteContent/devSettings";

export default function AdminDevSettings() {
  const [settings, setSettings] = useState({
    groqApiKey: "",
    fallbackApiKey: "",
    aiModelOverride: "",
    maintenanceMode: false,
    maintenanceMessage: "We'll be back soon!",
    featureFlags: {
      aiTutor: true,
      mockExams: true,
      studyPartners: true,
      teams: true,
      whiteboard: true,
      flashcards: true,
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, SETTINGS_DOC));
        if (snap.exists()) {
          setSettings((prev) => ({ ...prev, ...snap.data() }));
        }
      } catch (e) {
        console.error("Failed to load dev settings:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function save() {
    setSaving(true);
    try {
      await setDoc(doc(db, SETTINGS_DOC), settings, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error("Failed to save dev settings:", e);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ color: "var(--text-muted)", padding: 24 }}>Loading developer settings…</div>;
  }

  return (
    <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <Settings size={18} color="var(--primary)" />
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>Developer Settings</span>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8 }}>
          <Key size={12} style={{ display: "inline", marginRight: 4 }} /> Groq API Key
        </label>
        <input
          type="password"
          value={settings.groqApiKey}
          onChange={(e) => setSettings({ ...settings, groqApiKey: e.target.value })}
          placeholder="sk-groq-..."
          style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid #333", color: "#fff", fontSize: 13, outline: "none" }}
        />
        <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>Update this when users run out of credits. No redeploy needed.</p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8 }}>
          <Shield size={12} style={{ display: "inline", marginRight: 4 }} /> Fallback API Key
        </label>
        <input
          type="password"
          value={settings.fallbackApiKey}
          onChange={(e) => setSettings({ ...settings, fallbackApiKey: e.target.value })}
          placeholder="Backup Groq API key"
          style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid #333", color: "#fff", fontSize: 13, outline: "none" }}
        />
        <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>Used automatically when the primary key is unavailable or out of credits.</p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8 }}>AI Model Override</label>
        <select
          value={settings.aiModelOverride}
          onChange={(e) => setSettings({ ...settings, aiModelOverride: e.target.value })}
          style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid #333", color: "#fff", fontSize: 13, outline: "none" }}
        >
          <option value="">Auto (recommended)</option>
          <option value="qwen/qwen3.8-27b">Qwen 3.8 27B</option>
          <option value="openai/gpt-oss-120b">GPT OSS 120B</option>
          <option value="openai/gpt-oss-20b">GPT OSS 20B</option>
          <option value="allam-2-7b">Allam 2 7B</option>
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8 }}>
          <AlertTriangle size={12} style={{ display: "inline", marginRight: 4 }} /> Maintenance Mode
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <button
            onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
            style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: settings.maintenanceMode ? "#ef4444" : "var(--border)", position: "relative", transition: "background 0.2s" }}
          >
            <span style={{ position: "absolute", top: 2, left: settings.maintenanceMode ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
          </button>
          <span style={{ color: settings.maintenanceMode ? "#ef4444" : "var(--text-muted)", fontSize: 13, fontWeight: 600 }}>
            {settings.maintenanceMode ? "ON — users see maintenance page" : "OFF"}
          </span>
        </div>
        {settings.maintenanceMode && (
          <input
            value={settings.maintenanceMessage}
            onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })}
            placeholder="Maintenance message"
            style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid #333", color: "#fff", fontSize: 13, outline: "none", marginTop: 8 }}
          />
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8 }}>Feature Flags</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {Object.entries(settings.featureFlags).map(([key, val]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: "var(--bg-3)" }}>
              <span style={{ color: "var(--text)", fontSize: 13, textTransform: "capitalize" }}>{key.replace(/([A-Z])/g, " $1")}</span>
              <button
                onClick={() => setSettings({ ...settings, featureFlags: { ...settings.featureFlags, [key]: !val } })}
                style={{ width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer", background: val ? "#4ADE80" : "var(--border)", position: "relative" }}
              >
                <span style={{ position: "absolute", top: 2, left: val ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff" }} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <button onClick={save} disabled={saving} style={{ padding: "12px 24px", borderRadius: 8, background: "var(--primary)", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, opacity: saving ? 0.6 : 1 }}>
        {saving ? <Loader2 size={16} /> : <Save size={16} />} {saving ? "Saving..." : "Save Settings"}
      </button>
      {saved && <span style={{ color: "#4ADE80", fontSize: 13, marginLeft: 12 }}>Saved ✓</span>}
    </div>
  );
}
