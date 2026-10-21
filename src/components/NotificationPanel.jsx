// In-app notification center: personal notifications + admin updates.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useAuth } from "../context/AuthContext";
import { subscribeUpdates } from "../lib/community";
import { Bell, X, Megaphone, CheckCheck } from "lucide-react";

const SEEN_KEY = "exampadi_updates_seen";

function getSeen() {
  try { return localStorage.getItem(SEEN_KEY) || ""; } catch { return ""; }
}

export default function NotificationPanel({ bottom = false }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [updates, setUpdates] = useState([]);

  useEffect(() => {
    if (!db || !user?.uid) return;
    const q = query(collection(db, "notifications", user.uid, "items"), orderBy("createdAt", "desc"), limit(40));
    return onSnapshot(q, (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => setItems([]));
  }, [user?.uid]);

  useEffect(() => {
    const unsub = subscribeUpdates(setUpdates, 10);
    return () => unsub && unsub();
  }, []);

  const unread = useMemo(() => items.filter((n) => !n.read).length, [items]);
  const updateUnread = updates.length > 0 && updates[0].id !== getSeen();

  async function markAllRead() {
    await Promise.all(items.filter((n) => !n.read).map((n) =>
      updateDoc(doc(db, "notifications", user.uid, "items", n.id), { read: true }).catch(() => {})
    ));
    if (updates.length > 0) {
      try { localStorage.setItem(SEEN_KEY, updates[0].id); } catch { /* private mode */ }
    }
  }

  function toggle() {
    setOpen((o) => !o);
    if (!open) setTimeout(markAllRead, 1200);
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={toggle}
        title="Notifications"
        aria-label="Notifications"
        style={{
          width: 40, height: 40, borderRadius: "50%", position: "relative",
          background: "var(--bg-2)", border: "1px solid var(--border)",
          color: "var(--text)", cursor: "pointer", display: "flex",
          alignItems: "center", justifyContent: "center",
        }}
      >
        <Bell size={18} />
        {(unread > 0 || updateUnread) && (
          <span style={{
            position: "absolute", top: -3, right: -3, minWidth: 18, height: 18, padding: "0 4px",
            borderRadius: 99, background: "var(--danger, #ef4444)", color: "#fff",
            fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid var(--bg-2)",
          }}>{unread || ""}</span>
        )}
      </button>

      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 60 }} onClick={() => setOpen(false)} />
          <div className="glass-card" style={{
            position: "absolute", right: bottom ? "50%" : 0,
            transform: bottom ? "translateX(50%)" : "none",
            top: bottom ? "auto" : 48, bottom: bottom ? 48 : "auto",
            width: "min(380px, 88vw)", zIndex: 61,
            maxHeight: "70vh", overflowY: "auto", padding: 16,
          }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-text flex items-center gap-2"><Bell size={16} className="text-primary" /> Notifications</h3>
              <div className="flex items-center gap-1">
                <button onClick={markAllRead} title="Mark all read" style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}><CheckCheck size={16} /></button>
                <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}><X size={16} /></button>
              </div>
            </div>

            {items.length === 0 && updates.length === 0 ? (
              <p className="text-sm text-text-muted">Nothing yet. Assignment, submission, review and chat updates land here.</p>
            ) : (
              <div className="space-y-2">
                {items.map((n) => (
                  <Link
                    key={n.id}
                    to={n.link || "/dashboard"}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl p-2.5 border border-border"
                    style={{ background: n.read ? "transparent" : "rgb(var(--primary-rgb) / 0.08)" }}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-text truncate">{n.title}</p>
                        {n.body && <p className="text-xs text-text-muted line-clamp-2">{n.body}</p>}
                      </div>
                    </div>
                  </Link>
                ))}
                {updates.length > 0 && (
                  <div className="pt-2 mt-2 border-t border-border">
                    <h4 className="text-xs font-black text-text-muted flex items-center gap-1.5 mb-2"><Megaphone size={13} className="text-primary" /> What's new</h4>
                    {updates.map((u) => (
                      <div key={u.id} className="mb-2">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-primary">{u.tag || "New"}</div>
                        <div className="text-sm font-bold text-text">{u.title}</div>
                        <div className="text-xs text-text-muted">{u.body}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <Link to="/settings" onClick={() => setOpen(false)} className="text-xs font-bold text-primary block mt-3">
              Notification settings →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
