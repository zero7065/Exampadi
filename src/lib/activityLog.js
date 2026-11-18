import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";

// Central activity logger. Fire-and-forget — never blocks UX.
// Every entry carries userId so a user can read their own trail
// (firestore.rules: activityLog read if request.auth.uid == resource.data.userId)
// while admins can read all.
export async function logActivity({ action, userId, email, details }) {
  if (!db) return;
  const entry = {
    action,
    userId: userId || null,
    email: email || null,
    details: details || {},
    timestamp: serverTimestamp(),
  };
  try {
    await addDoc(collection(db, "activityLog"), entry);
  } catch (e) {
    console.warn("Activity log failed:", e);
  }
}

export function getAdminUids() {
  const raw = import.meta.env.VITE_ADMIN_UIDS || "";
  return raw.split(",").filter(Boolean).map(s => s.trim());
}

export function isAdmin(user) {
  if (!user) return false;
  const adminUids = getAdminUids();
  if (adminUids.includes(user.uid)) return true;
  if (user.email === "jadai7065@gmail.com") return true;
  if (user.role === "admin") return true;
  return false;
}
