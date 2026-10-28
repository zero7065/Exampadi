import { useState, useEffect } from "react";
import { Bell, BellOff, X } from "lucide-react";

export default function NotificationPrompt() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      const saved = localStorage.getItem("ep-notif-dismissed");
      if (!saved) setDismissed(false);
    }
  }, []);

  if (dismissed) return null;

  async function handleEnable() {
    const result = await Notification.requestPermission();
    localStorage.setItem("ep-notif-dismissed", "true");
    setDismissed(true);
    if (result === "granted") {
      new Notification("ExamPadi", {
        body: "We'll remind you to study and keep your streak alive!",
        icon: "/pwa-192x192.png",
      });
    }
  }

  return (
    <div style={{
      background: "var(--bg-2)", border: "1px solid rgb(var(--primary-rgb) / 0.3)", borderRadius: 12,
      padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center",
      gap: 12, position: "relative",
    }}>
      <Bell size={20} color="var(--primary)" />
      <div style={{ flex: 1, fontSize: 13, color: "var(--text)" }}>
        Get study reminders and streak alerts
      </div>
      <button onClick={handleEnable} style={{
        padding: "6px 14px", borderRadius: 8, background: "var(--primary)", border: "none",
        color: "var(--text)", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
      }}>
        Enable
      </button>
      <button
        onClick={() => { localStorage.setItem("ep-notif-dismissed", "true"); setDismissed(true); }}
        style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 2 }}
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}
