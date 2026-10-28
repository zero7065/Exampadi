import { isOnline } from "../lib/presence";

export default function PresenceBadge({ presence, label = true }) {
  const online = isOnline(presence);
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={online ? "Online" : "Offline"}>
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${online ? "bg-emerald-500" : "bg-zinc-400"}`} />
      {label && <span className="text-xs text-text-muted">{online ? "Online" : "Offline"}</span>}
    </span>
  );
}
