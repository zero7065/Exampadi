// ActiveGames — "continue later" list of the user's in-progress chess rooms.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useAuth } from "../context/AuthContext";
import { Play } from "lucide-react";

export default function ActiveGames() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    if (!user?.uid || !db) return;
    let live = true;
    (async () => {
      try {
        const [asHost, asGuest] = await Promise.all([
          getDocs(query(collection(db, "chessRooms"), where("hostUid", "==", user.uid), limit(20))).catch(() => ({ docs: [] })),
          getDocs(query(collection(db, "chessRooms"), where("guestUid", "==", user.uid), limit(20))).catch(() => ({ docs: [] })),
        ]);
        const all = [...asHost.docs, ...asGuest.docs].map((d) => ({ id: d.id, ...d.data() }));
        const active = all.filter((r) => r.status === "active").slice(0, 5);
        if (live) setRooms(active);
      } catch { /* optional widget */ }
    })();
    return () => { live = false; };
  }, [user?.uid]);

  if (!rooms.length) return null;

  return (
    <div className="glass-card p-5 mt-2" style={{ borderColor: "rgb(var(--primary-rgb) / 0.3)" }}>
      <h2 className="font-black text-text mb-2 flex items-center gap-2"><Play size={16} className="text-primary" /> Continue a game</h2>
      <div className="space-y-2">
        {rooms.map((r) => (
          <Link key={r.id} to={`/chess/room/${r.id}`} className="flex items-center justify-between gap-2 p-3 rounded-xl" style={{ background: "var(--bg-3)" }}>
            <div className="min-w-0">
              <div className="text-sm font-bold text-text truncate">
                vs {r.hostUid === user.uid ? (r.guestName || "Opponent") : r.hostName} · {r.timeControl === "unlimited" ? "Unlimited" : "Timed"}
              </div>
              <div className="text-[10px] text-text-muted">{r.paused ? "Paused" : "In progress"} · {r.id}</div>
            </div>
            <span className="text-xs font-bold whitespace-nowrap" style={{ color: "var(--primary)" }}>Continue →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
