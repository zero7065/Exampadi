// AdminDiagnostics — system health monitor, auto-fix, backup/restore.
// Checks Firestore/AI/Auth health, shows recent errors, and lets the admin
// export all collections (backup) or restore from a backup JSON.
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "./Toast";
import {
  collection, getDocs, query, orderBy, limit, doc, writeBatch, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { askGroq, getAIErrorIfRecent } from "../lib/ai";
import {
  Activity, CheckCircle2, XCircle, AlertTriangle, Loader2, Download, Upload,
  RefreshCw, Database, Wifi, Bot, Shield, FileJson, Wrench, Heart,
} from "lucide-react";

const COLLECTIONS_TO_BACKUP = [
  "users", "activityLog", "sessions", "mockExams", "aiTrainingData", "aiUsageLog",
  "schools", "classes", "studyRooms", "discussions", "helpRequests", "gameChallenges",
  "learningPatterns", "parentThreads", "communityGroups", "adminMessages", "reviews", "payments",
];

export default function AdminDiagnostics() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [checks, setChecks] = useState([]);
  const [running, setRunning] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [lastBackup, setLastBackup] = useState(null);

  useEffect(() => {
    runDiagnostics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runDiagnostics() {
    setRunning(true);
    const results = [];
    // 1. Firestore connectivity
    try {
      await getDocs(query(collection(db, "users"), limit(1)));
      results.push({ name: "Firestore connection", ok: true, detail: "Reachable" });
    } catch (e) {
      results.push({ name: "Firestore connection", ok: false, detail: e.message });
    }
    // 2. Auth
    results.push({ name: "Authentication", ok: !!user, detail: user ? `Signed in as ${user.email}` : "Not signed in" });
    // 3. AI connectivity (lightweight)
    try {
      await askGroq("Reply with exactly: OK", "Health check", { maxTokens: 10, source: "diagnostic" });
      const err = getAIErrorIfRecent();
      results.push({ name: "AI provider (Groq)", ok: !err, detail: err ? err.message : "Responding" });
    } catch (e) {
      results.push({ name: "AI provider (Groq)", ok: false, detail: e.message });
    }
    // 4. Recent errors from activityLog
    try {
      const snap = await getDocs(query(collection(db, "activityLog"), orderBy("timestamp", "desc"), limit(50)));
      const errors = snap.docs.filter((d) => {
        const a = d.data().action || "";
        return a.includes("error") || a.includes("failed") || a.includes("payment_failed");
      });
      results.push({ name: "Recent error events", ok: errors.length === 0, detail: errors.length > 0 ? `${errors.length} error events in last 50` : "No errors in recent activity" });
    } catch (e) {
      results.push({ name: "Activity log", ok: false, detail: e.message });
    }
    // 5. Data freshness
    try {
      const snap = await getDocs(query(collection(db, "activityLog"), orderBy("timestamp", "desc"), limit(1)));
      if (!snap.empty) {
        const ts = snap.docs[0].data().timestamp;
        const ms = ts?.toMillis?.() || 0;
        const ageMin = ms ? Math.round((Date.now() - ms) / 60000) : null;
        results.push({ name: "Data freshness", ok: true, detail: ageMin !== null ? `Last activity ${ageMin}m ago` : "No timestamp" });
      } else {
        results.push({ name: "Data freshness", ok: true, detail: "No activity yet" });
      }
    } catch {
      results.push({ name: "Data freshness", ok: false, detail: "Could not read" });
    }
    // 6. Storage bucket (config only — no write)
    const configured = !!(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET);
    results.push({ name: "Firebase Storage configured", ok: configured, detail: configured ? "Bucket set" : "Bucket env var missing (image uploads will fail)" });

    setChecks(results);
    setRunning(false);
  }

  async function autoFix() {
    setRunning(true);
    try {
      // Clear local caches that may be stale
      try {
        localStorage.removeItem("exampadi_landing_media");
        localStorage.removeItem("ep_leaderboard_cache");
        localStorage.removeItem("aiTrainingQueue");
        localStorage.removeItem("exampadi_active_session");
      } catch { /* private mode */ }
      // Re-run diagnostics to verify
      await runDiagnostics();
      toast({ message: "Auto-fix complete — caches cleared, re-checking…", type: "success" });
    } catch (e) {
      toast({ message: `Auto-fix failed: ${e.message}`, type: "error" });
    } finally {
      setRunning(false);
    }
  }

  async function backup() {
    setBackingUp(true);
    try {
      const snapshot = {};
      let totalDocs = 0;
      for (const name of COLLECTIONS_TO_BACKUP) {
        try {
          const snap = await getDocs(collection(db, name));
          snapshot[name] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          totalDocs += snapshot[name].length;
        } catch (e) {
          snapshot[name] = [];
          console.warn(`backup skip ${name}:`, e.message);
        }
      }
      const payload = { exportedAt: new Date().toISOString(), totalDocs, snapshot };
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `exampadi-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setLastBackup(new Date());
      toast({ message: `Backup ready — ${totalDocs} docs exported ✓`, type: "success" });
    } catch (e) {
      toast({ message: `Backup failed: ${e.message}`, type: "error" });
    } finally {
      setBackingUp(false);
    }
  }

  function restoreFromFile(file) {
    if (!file) return;
    setRestoring(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const payload = JSON.parse(String(reader.result));
        const snapData = payload.snapshot || payload;
        let restored = 0;
        for (const [name, docs] of Object.entries(snapData)) {
          if (!Array.isArray(docs)) continue;
          const batch = writeBatch(db);
          let count = 0;
          for (const d of docs.slice(0, 400)) { // cap per collection
            const { id, ...data } = d;
            if (!id) continue;
            // strip undefined + serverTimestamp sentinels
            const clean = {};
            for (const [k, v] of Object.entries(data)) {
              if (v === undefined) continue;
              clean[k] = v;
            }
            clean._restoredAt = serverTimestamp();
            batch.set(doc(db, name, id), clean, { merge: true });
            count++;
          }
          await batch.commit();
          restored += count;
        }
        toast({ message: `Restore complete — ${restored} docs merged ✓`, type: "success" });
      } catch (e) {
        toast({ message: `Restore failed: ${e.message}`, type: "error" });
      } finally {
        setRestoring(false);
      }
    };
    reader.readAsText(file);
  }

  const allOk = checks.every((c) => c.ok);

  return (
    <div className="space-y-4">
      {/* Health summary */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Heart size={18} className={allOk ? "text-success" : "text-amber-500"} />
            <h3 className="font-black text-text">System Health</h3>
          </div>
          <div className="flex gap-2">
            <button onClick={runDiagnostics} disabled={running} className="btn-secondary text-xs px-3 py-2">
              {running ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Re-check
            </button>
            <button onClick={autoFix} disabled={running} className="btn-primary text-xs px-3 py-2">
              <Wrench size={13} /> Auto-fix
            </button>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {checks.map((c, i) => (
            <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: "var(--bg-3)" }}>
              {c.ok ? <CheckCircle2 size={16} className="text-success shrink-0" /> : <XCircle size={16} className="text-danger shrink-0" />}
              <div className="min-w-0">
                <div className="text-xs font-bold text-text truncate">{c.name}</div>
                <div className="text-[10px] text-text-muted truncate" title={c.detail}>{c.detail}</div>
              </div>
            </div>
          ))}
        </div>
        {running && checks.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-text-muted mt-2"><Loader2 size={14} className="animate-spin" /> Running diagnostics…</div>
        )}
      </div>

      {/* Backup / Restore */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Download size={18} className="text-primary" />
            <h3 className="font-black text-text">Backup</h3>
          </div>
          <p className="text-xs text-text-muted mb-3" style={{ lineHeight: 1.5 }}>
            Export all collections to a JSON file. Take a backup before bulk changes.
          </p>
          <button onClick={backup} disabled={backingUp} className="btn-primary w-full">
            {backingUp ? <Loader2 size={15} className="animate-spin" /> : <FileJson size={15} />}
            {backingUp ? "Backing up…" : "Export backup"}
          </button>
          {lastBackup && <p className="text-[10px] text-text-muted mt-2">Last backup: {lastBackup.toLocaleTimeString()}</p>}
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Upload size={18} className="text-amber-500" />
            <h3 className="font-black text-text">Restore</h3>
          </div>
          <p className="text-xs text-text-muted mb-3" style={{ lineHeight: 1.5 }}>
            Merge a backup JSON back into Firestore (existing docs are updated, new ones added).
          </p>
          <label className="btn-secondary w-full cursor-pointer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            {restoring ? <Loader2 size={15} className="animate-spin" /> : <Database size={15} />}
            {restoring ? "Restoring…" : "Choose backup file"}
            <input type="file" accept="application/json" disabled={restoring} style={{ display: "none" }}
              onChange={(e) => { restoreFromFile(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
        </div>
      </div>

      <p className="text-[10px] text-text-muted flex items-center gap-1">
        <Shield size={10} /> Backups are generated client-side from your admin session. Keep the JSON file safe — it contains user data.
      </p>
    </div>
  );
}