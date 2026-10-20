// First-visit consent notice: essential storage + links to Terms/Privacy.
// NDPR/GDPR-friendly one-time acknowledgement, stored locally.
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

const KEY = "ep_consent_v1";

export default function ConsentBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    try {
      if (!localStorage.getItem(KEY) && mounted) setVisible(true);
    } catch { /* private mode — skip */ }
    return () => { mounted = false; };
  }, []);

  if (!visible) return null;

  function accept() {
    try { localStorage.setItem(KEY, String(Date.now())); } catch { /* ignore */ }
    setVisible(false);
  }

  return (
    <div className="fixed left-0 right-0 bottom-0 md:bottom-0 z-[90] md:left-64 md:right-0 px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom,0px))] md:pb-3"
      style={{
        background: "var(--bg-2)",
        borderTop: "1px solid rgb(var(--primary-rgb) / 0.35)",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.35)",
      }}
      role="region"
      aria-label="Privacy consent"
    >
      <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <ShieldCheck size={20} className="text-primary shrink-0 mt-0.5" />
        <p className="text-xs sm:text-sm text-text-muted leading-relaxed flex-1">
          We use essential storage to keep you signed in, save your progress and protect your account.
          By continuing you agree to our{" "}
          <Link to="/terms" className="text-primary hover:underline font-bold">Terms</Link>
          {" "}and{" "}
          <Link to="/privacy" className="text-primary hover:underline font-bold">Privacy Policy</Link>.
        </p>
        <button
          onClick={accept}
          className="btn-primary px-5 py-2.5 text-sm font-black shrink-0 w-full sm:w-auto"
        >
          I Agree — Continue
        </button>
      </div>
    </div>
  );
}
