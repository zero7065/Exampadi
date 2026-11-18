import { WifiOff, X } from "lucide-react";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

export default function OfflineIndicator() {
  const { isOnline, showBanner, dismissBanner } = useOnlineStatus();

  if (isOnline && !showBanner) return null;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, background: "#ef4444", color: "#fff", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
      <WifiOff size={16} />
      <span>You're offline. Some features require an internet connection.</span>
      <button onClick={dismissBanner} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", marginLeft: "auto", padding: 4 }}>
        <X size={16} />
      </button>
    </div>
  );
}
