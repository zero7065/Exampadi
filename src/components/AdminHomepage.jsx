// AdminHomepage — full overwrite/customization of the landing page hero slides
// and section visibility. Saves to siteContent/homepage (live for all visitors).
import { useEffect, useState } from "react";
import { useToast } from "./Toast";
import { loadHomepageContent, saveHomepageContent, DEFAULT_HOMEPAGE, invalidateHomepageCache } from "../lib/homepageContent";
import { LayoutTemplate, Save, Plus, Trash2, Loader2, RotateCcw, Eye, EyeOff, ExternalLink } from "lucide-react";

const SCENE_OPTIONS = [
  { id: "study", label: "Study desk (default)" },
  { id: "graduation", label: "Graduation / confetti" },
  { id: "community", label: "Community chat" },
];

const SECTION_LABELS = {
  whatsNew: "What's New (feature showcase)",
  eduClips: "Educational micro-clips",
  games: "Games showcase",
  testimonials: "Testimonials",
  pricing: "Pricing",
  faq: "FAQ",
};

const inputStyle = { width: "100%", padding: "9px 12px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" };

export default function AdminHomepage() {
  const { toast } = useToast();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    loadHomepageContent().then((c) => setContent(c)).finally(() => setLoading(false));
  }, []);

  function updateSlide(i, patch) {
    setContent((c) => {
      const slides = c.slides.map((s, j) => (j === i ? { ...s, ...patch } : s));
      return { ...c, slides };
    });
  }

  function addSlide() {
    setContent((c) => ({
      ...c,
      slides: [...c.slides, {
        id: `custom-${Date.now()}`,
        scene: "study",
        eyebrow: "NEW",
        title: "Your headline here",
        body: "Describe the feature or offer. Keep it short and vivid.",
        ctaLabel: "Get started",
        ctaTo: "/auth",
        secondaryLabel: "",
        secondaryTo: "",
      }],
    }));
    setActive((a) => (content?.slides?.length || 0));
  }

  function removeSlide(i) {
    if (content.slides.length <= 1) { toast({ message: "Keep at least one slide", type: "warning" }); return; }
    setContent((c) => ({ ...c, slides: c.slides.filter((_, j) => j !== i) }));
    setActive(0);
  }

  async function save() {
    setSaving(true);
    try {
      await saveHomepageContent(content);
      invalidateHomepageCache();
      toast({ message: "Homepage published ✓ — refresh the landing page to see it", type: "success" });
    } catch (e) {
      toast({ message: e.message, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    if (!confirm("Reset all homepage content to defaults?")) return;
    setContent(JSON.parse(JSON.stringify(DEFAULT_HOMEPAGE)));
    setActive(0);
    toast({ message: "Reset to defaults — click Publish to apply", type: "info" });
  }

  if (loading || !content) return <div style={{ color: "var(--text-muted)", padding: 24 }}><Loader2 className="animate-spin" /> Loading homepage content…</div>;

  const slide = content.slides[active] || content.slides[0];

  return (
    <div className="space-y-4">
      <div className="glass-card p-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <LayoutTemplate size={18} className="text-primary" />
            <div>
              <h3 className="font-black text-text">Homepage Customization</h3>
              <p className="text-xs text-text-muted">Edit the hero carousel and toggle sections — live for all visitors.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <a href="/" target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs px-3 py-2"><ExternalLink size={13} /> Preview</a>
            <button onClick={reset} className="btn-secondary text-xs px-3 py-2"><RotateCcw size={13} /> Reset</button>
            <button onClick={save} disabled={saving} className="btn-primary text-xs px-4 py-2">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Publish
            </button>
          </div>
        </div>
      </div>

      {/* Slide tabs */}
      <div className="flex gap-2 flex-wrap items-center">
        {content.slides.map((s, i) => (
          <button key={s.id || i} onClick={() => setActive(i)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{ background: active === i ? "var(--primary)" : "var(--bg-3)", color: active === i ? "#000" : "var(--text-muted)" }}>
            Slide {i + 1}
          </button>
        ))}
        <button onClick={addSlide} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: "var(--bg-3)", color: "var(--primary)" }}>
          <Plus size={12} style={{ display: "inline" }} /> Add slide
        </button>
        {content.slides.length > 1 && (
          <button onClick={() => removeSlide(active)} className="px-2 py-1.5 rounded-lg text-xs" style={{ background: "rgba(255,77,106,0.1)", color: "var(--danger)" }}>
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {/* Slide editor */}
      {slide && (
        <div className="glass-card p-5 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs font-bold text-text-muted">
              Background scene
              <select value={slide.scene} onChange={(e) => updateSlide(active, { scene: e.target.value })} style={{ ...inputStyle, marginTop: 4 }}>
                {SCENE_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-text-muted">
              Eyebrow (small label)
              <input value={slide.eyebrow} onChange={(e) => updateSlide(active, { eyebrow: e.target.value })} style={{ ...inputStyle, marginTop: 4 }} />
            </label>
          </div>
          <label className="text-xs font-bold text-text-muted block">
            Headline
            <input value={slide.title} onChange={(e) => updateSlide(active, { title: e.target.value })} style={{ ...inputStyle, marginTop: 4 }} />
          </label>
          <label className="text-xs font-bold text-text-muted block">
            Body text
            <textarea value={slide.body} onChange={(e) => updateSlide(active, { body: e.target.value })} rows={3} style={{ ...inputStyle, marginTop: 4, resize: "vertical" }} />
          </label>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs font-bold text-text-muted">
              Primary button label
              <input value={slide.ctaLabel} onChange={(e) => updateSlide(active, { ctaLabel: e.target.value })} style={{ ...inputStyle, marginTop: 4 }} />
            </label>
            <label className="text-xs font-bold text-text-muted">
              Primary button link
              <input value={slide.ctaTo} onChange={(e) => updateSlide(active, { ctaTo: e.target.value })} placeholder="/auth" style={{ ...inputStyle, marginTop: 4 }} />
            </label>
            <label className="text-xs font-bold text-text-muted">
              Secondary button label (optional)
              <input value={slide.secondaryLabel || ""} onChange={(e) => updateSlide(active, { secondaryLabel: e.target.value })} style={{ ...inputStyle, marginTop: 4 }} />
            </label>
            <label className="text-xs font-bold text-text-muted">
              Secondary button link
              <input value={slide.secondaryTo || ""} onChange={(e) => updateSlide(active, { secondaryTo: e.target.value })} placeholder="/demo" style={{ ...inputStyle, marginTop: 4 }} />
            </label>
          </div>
        </div>
      )}

      {/* Section toggles */}
      <div className="glass-card p-5">
        <h3 className="font-black text-text mb-3">Show / hide homepage sections</h3>
        <div className="grid sm:grid-cols-2 gap-2">
          {Object.entries(content.sections).map(([key, on]) => (
            <button key={key}
              onClick={() => setContent((c) => ({ ...c, sections: { ...c.sections, [key]: !on } }))}
              className="flex items-center justify-between p-3 rounded-xl text-left"
              style={{ background: "var(--bg-3)", border: `1px solid ${on ? "var(--success)" : "var(--border)"}` }}>
              <span className="text-sm font-semibold text-text">{SECTION_LABELS[key] || key}</span>
              <span style={{ color: on ? "var(--success)" : "var(--text-muted)", display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 800 }}>
                {on ? <><Eye size={13} /> ON</> : <><EyeOff size={13} /> OFF</>}
              </span>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-text-muted mt-3">Section toggles apply on next publish. Hero carousel always shows.</p>
      </div>
    </div>
  );
}