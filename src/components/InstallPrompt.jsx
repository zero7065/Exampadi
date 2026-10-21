import { useState, useEffect } from "react";
import { Download, Share, X } from "lucide-react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [ios] = useState(() =>
    typeof navigator !== "undefined" && (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    )
  );
  const [standalone] = useState(() =>
    typeof window !== "undefined" && (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    )
  );

  useEffect(() => {
    if (standalone) return;

    const dismissed = Number(localStorage.getItem("ep-install-dismissed") || 0);
    if (Date.now() - dismissed < 3 * 86400000) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const timer = setTimeout(() => {
      if (ios) setShow(true);
    }, 6000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
    };
  }, [standalone, ios]);

  useEffect(() => {
    if (!deferredPrompt) return;
    const timer = setTimeout(() => setShow(true), 5000);
    return () => clearTimeout(timer);
  }, [deferredPrompt]);

  async function install() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setShow(false);
    setDeferredPrompt(null);
  }

  function dismiss() {
    localStorage.setItem("ep-install-dismissed", Date.now().toString());
    setShow(false);
  }

  if (!show || standalone) return null;

  return (
    <div style={{
      position: "fixed", bottom: 84, left: 12, right: 12, zIndex: 8888,
      maxWidth: 430, margin: "0 auto",
      background: "var(--bg-card)",
      border: "1px solid rgb(var(--primary-rgb) / 0.28)", borderRadius: 16,
      padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 12,
      boxShadow: "0 12px 40px rgb(var(--primary-rgb) / 0.16), 0 4px 16px rgba(0,0,0,0.25)",
      animation: "slideUp 0.35s ease-out",
    }}>
      <style>{`@keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
      <div style={{
        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
        background: "linear-gradient(135deg, var(--primary), var(--accent))",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Download size={20} color="#04120D" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: "var(--text)", fontWeight: 800, margin: 0, fontSize: 14 }}>
          Install ExamPadi
        </p>
        {ios ? (
          <p style={{ color: "var(--text-muted)", fontSize: 12, margin: "4px 0 0", lineHeight: 1.45 }}>
            Tap <Share size={12} style={{ display: "inline", verticalAlign: "-1px" }} /> Share, then
            <strong style={{ color: "var(--text)" }}> Add to Home Screen</strong>.
          </p>
        ) : (
          <p style={{ color: "var(--text-muted)", fontSize: 12, margin: "4px 0 0", lineHeight: 1.45 }}>
            Full-screen app, offline access and push notifications.
          </p>
        )}
        {!ios && (
          <button onClick={install} style={{
            marginTop: 10, padding: "8px 14px", borderRadius: 9, border: "none",
            background: "var(--primary)", color: "#04120D", fontWeight: 800,
            cursor: "pointer", fontSize: 13, fontFamily: "inherit",
          }}>
            Install app
          </button>
        )}
      </div>
      <button onClick={dismiss} aria-label="Dismiss install prompt" style={{
        background: "none", border: "none", color: "var(--text-muted)",
        cursor: "pointer", padding: 2, flexShrink: 0,
      }}>
        <X size={18} />
      </button>
    </div>
  );
}
