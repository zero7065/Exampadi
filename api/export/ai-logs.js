// api/export/ai-logs.js
import { getFirebase } from "./_firebase.js";

export const config = { runtime: "nodejs", maxDuration: 60 };

// Hash the UID so the export can be restored later (no raw UIDs)
function hashUid(uid) {
  if (!uid) return "";
  const encoder = new TextEncoder();
  const data = encoder.encode(uid);
  const hashBuffer = new Uint8Array(data.buffer);
  const hashArray = Array.from(hashBuffer);
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

export default async function handler(req, res) {
  const token = req.headers.authorization?.replace("Bearer ", "").trim();
  const fb = getFirebase();
  if (!fb) return res.status(500).end();

  let uid;
  try {
    const decoded = await fb.admin.auth().verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Only admins can pull the full corpus
  const userSnap = await fb.db.collection("users").doc(uid).get();
  const isAdmin = userSnap.data()?.role === "admin" || process.env.ADMIN_UIDS?.split(",").includes(uid);
  const scope = isAdmin ? req.query.scope || "all" : "self";

  const { from, to } = req.query;
  let q = fb.db.collection("aiLogs").orderBy("createdAt", "desc").limit(5000);
  if (from) q = q.where("createdAt", ">=", new Date(from));
  if (to)   q = q.where("createdAt", "<=", new Date(to));
  if (scope === "self") q = q.where("uid", "==", hashUid(uid));

  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Content-Disposition", `attachment; filename="ai-logs-${Date.now()}.jsonl"`);

  const snap = await q.get();
  snap.forEach(doc => {
    const d = doc.data();
    delete d.promptPreview;
    delete d.responsePreview;
    res.write(JSON.stringify({ id: doc.id, ...d }) + "\n");
  });
  res.end();
}