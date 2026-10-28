import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSubscription } from "../hooks/useSubscription";
import { useNotifications } from "../hooks/useNotifications";
import { getUserProfile, updateUserProfile } from "../lib/userProfile";
import { useToast } from "../components/Toast";
import { doc, updateDoc, collection, getDocs, writeBatch, query, where } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { updateProfile } from "firebase/auth";
import ProUpgradeModal from "../components/ProUpgradeModal";
import { getStudentMemory, recordStyle } from "../lib/aiMemory";
import { LEARNING_STYLES } from "../components/Onboarding/LearningStyleMini";
import { exportUserData, downloadJson, exportAllowedAt, markExported } from "../lib/compliance";
import { ALL_EXAMS } from "../lib/exams";
import { useTheme } from "../context/ThemeContext";
import pkg from "../../package.json";
import { User, BookOpen, CreditCard, Bell, Sliders, AlertTriangle, ChevronRight, Check, Pencil, Clock, Activity } from "lucide-react";
import NetworkDiagnostic from "../components/NetworkDiagnostic";

const SUBJECT_OPTIONS = ["English", "Maths", "Physics", "Chemistry", "Biology", "Economics", "Government", "Literature", "CRS", "Geography", "Commerce", "Accounting", "Further Maths", "Agricultural Science", "Technical Drawing", "Business Management"];
const EXAM_OPTIONS = ["JAMB", "WAEC", "NABTEB", "POST-UTME"];

function LearningStylePicker({ uid }) {
  const { toast } = useToast();
  const [style, setStyle] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (uid) getStudentMemory(uid).then((m) => setStyle(m.preferredStyle || null)).catch(() => {});
  }, [uid]);

  async function pick(id) {
    setStyle(id);
    if (!uid) return;
    setSaving(true);
    try {
      await recordStyle(uid, id);
      toast({ message: "AI tutor style updated", type: "success" });
    } catch (_) {
      toast({ message: "Saved locally — will sync when online", type: "info" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {LEARNING_STYLES.map((s) => {
        const sel = style === s.id;
        return (
          <button
            key={s.id}
            onClick={() => pick(s.id)}
            disabled={saving}
            title={s.desc}
            style={{
              padding: "8px 14px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
              border: sel ? "2px solid var(--primary)" : "1px solid var(--border)",
              background: sel ? "var(--primary-dim)" : "var(--bg-3)",
              color: sel ? "var(--text)" : "var(--text-muted)",
              fontWeight: sel ? 700 : 500, fontSize: 13,
            }}
          >
            {s.emoji} {s.label}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({ value, onChange }) {  return (
    <button onClick={() => onChange(!value)} style={{
      width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", padding: 2,
      background: value ? "var(--primary)" : "var(--border)", transition: "background 0.2s", position: "relative",
    }}>
      <div style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--text)", transition: "transform 0.2s", transform: value ? "translateX(20px)" : "translateX(0)" }} />
    </button>
  );
}

const DEFAULT_PREFERENCES = {
  sessionLength: 10, questionOrder: "random", showHints: false, autoAdvance: false,
  dailyReminder: true, streakAlerts: true, newQuestions: true,
  showIntlExams: false, // IELTS/SAT hidden from the menu until turned on
};

export default function Settings() {
  const { user } = useAuth();
  const { isPro, daysLeft, loading: subLoading } = useSubscription();
  const { permission: notifPermission, requestPermission, scheduleReminder } = useNotifications();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [targetInput, setTargetInput] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [enabledExams, setEnabledExams] = useState([...ALL_EXAMS]);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [showExamModal, setShowExamModal] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetInput, setResetInput] = useState("");
  const [reduceMotion, setReduceMotion] = useState(() => {
    try { return localStorage.getItem("ep-reduce-motion") === "1"; } catch { return false; }
  });
  const [exporting, setExporting] = useState(false);
  const debounceRef = useRef(null);
  const { theme, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", reduceMotion);
    try { localStorage.setItem("ep-reduce-motion", reduceMotion ? "1" : "0"); } catch { /* persistence best-effort */ }
  }, [reduceMotion]);

  async function handleExportData() {
    if (!user) return;
    if (!exportAllowedAt(user.uid)) {
      toast({ message: "Data export is limited to once every 24 hours", type: "warning" });
      return;
    }
    setExporting(true);
    try {
      const data = await exportUserData(user.uid);
      downloadJson(`exampadi-data-${user.uid.slice(0, 8)}.json`, data);
      markExported(user.uid);
      toast({ message: "Your data has been downloaded", type: "success" });
    } catch (e) {
      toast({ message: `Export failed: ${e.message}`, type: "error" });
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => { document.title = "Settings — ExamPadi"; }, []);

  useEffect(() => {
    if (user) getUserProfile(user.uid).then(p => {
      setProfile(p);
      setSelectedSubjects(p?.subjects || []);
      if (Array.isArray(p?.examsEnabled) && p.examsEnabled.length > 0) {
        setEnabledExams(ALL_EXAMS.filter((e) => p.examsEnabled.includes(e)));
      }
      setNameInput(user.displayName || "");
      setTargetInput(String(p?.targetScore || 280));
      if (p?.preferences) setPreferences({ ...DEFAULT_PREFERENCES, ...p.preferences });
    }).catch(() => {});
  }, [user]);

  async function updateFirestore(data) {
    if (!user) return;
    try { await updateUserProfile(user.uid, data); } catch (e) { console.warn("Settings save error:", e); toast({ message: "Failed to save — check your connection", type: "error" }); }
  }

  function handleNameSave() {
    if (nameInput.trim() && user) { updateProfile(user, { displayName: nameInput.trim() }).then(() => updateFirestore({ name: nameInput.trim() })); }
    setEditingName(false);
  }

  function handleTargetSave(val) {
    const n = parseInt(val);
    setTargetInput(val);
    if (n < 150 || n > 400 || isNaN(n)) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateFirestore({ targetScore: n }), 800);
  }

  function handleSubjectToggle(subj) {
    const next = selectedSubjects.includes(subj) ? selectedSubjects.filter(s => s !== subj) : [...selectedSubjects, subj];
    setSelectedSubjects(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateFirestore({ subjects: next }), 1000);
  }

  function handleExamToggle(ex) {
    setEnabledExams((prev) => {
      const next = prev.includes(ex)
        ? (prev.length <= 1 ? prev : prev.filter((e) => e !== ex))
        : [...prev, ex];
      if (next.length === prev.length && prev.includes(ex)) {
        toast({ message: "Keep at least one exam on.", type: "info" });
        return prev;
      }
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => updateFirestore({ examsEnabled: next }), 800);
      return next;
    });
  }

  function handlePref(key, val) {
    const next = { ...preferences, [key]: val };
    setPreferences(next);
    updateFirestore({ preferences: next });
  }

  async function handleResetProgress() {
    if (resetInput !== "RESET" || !user) return;
    try {
      const batch = writeBatch(db);
      const sesSnap = await getDocs(query(collection(db, "sessions"), where("userId", "==", user.uid)));
      sesSnap.forEach(d => batch.delete(d.ref));
      const mockSnap = await getDocs(query(collection(db, "mockExams"), where("userId", "==", user.uid)));
      mockSnap.forEach(d => batch.delete(d.ref));
      await batch.commit();
      await updateDoc(doc(db, "users", user.uid), { totalQuestionsAnswered: 0, totalXP: 0, totalSessions: 0, mockExamsCompleted: 0 });
      setShowResetConfirm(false);
      setResetInput("");
      window.location.reload();
    } catch (e) { console.warn("Reset error:", e); }
  }



  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "'Inter', system-ui, sans-serif", color: "var(--text)" }} className="page-content">
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 24px" }}>Settings</h1>

        {/* Profile */}
        <Section title="Profile">
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
              onClick={() => alert("Profile photo coming soon")}>
              {user?.displayName?.[0] || "U"}
            </div>
            <div style={{ flex: 1 }}>
{editingName ? (
                <input autoFocus value={nameInput} onChange={e => setNameInput(e.target.value)} onBlur={handleNameSave} onKeyDown={e => e.key === "Enter" && handleNameSave()} style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", color: "var(--text)", fontSize: 16, fontWeight: 700, width: "100%", outline: "none", fontFamily: "inherit" }} />
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h2 className="text-2xl font-black text-text">{profile?.name || user?.displayName || "Student"}</h2>
                  <button onClick={() => setEditingName(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><Pencil size={15} /></button>
                </div>
              )}
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{user?.email}</div>
            </div>
          </div>
          <Row label="Exam" value={profile?.exam || "JAMB"} onClick={() => setShowExamModal(true)} />
          <Row label="Target Score" value={String(profile?.targetScore || 280)}>
            <input type="number" min={150} max={400} value={targetInput} onChange={e => handleTargetSave(e.target.value)} style={{ width: 80, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 10px", color: "var(--text)", fontSize: 13, textAlign: "center", outline: "none", fontFamily: "inherit" }} />
          </Row>
          <ToggleRow
            label="Show IELTS & SAT in menu"
            value={preferences.showIntlExams}
            onChange={v => handlePref("showIntlExams", v)}
          />
          <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>Hidden by default — switch on if you're preparing to study or take exams abroad.</p>
        </Section>

        {/* Appearance */}
        <Section title="Appearance">
          <ToggleRow label={`Theme (currently ${theme})`} value={theme === "dark"} onChange={() => toggleTheme()} />
          <ToggleRow label="Reduce motion" value={reduceMotion} onChange={setReduceMotion} />
        </Section>

        {/* Subjects */}
        <Section title="Your Subjects">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {SUBJECT_OPTIONS.map(s => {
              const sel = selectedSubjects.includes(s);
              return (
                <button key={s} onClick={() => handleSubjectToggle(s)} style={{ padding: "6px 14px", borderRadius: 8, border: sel ? "2px solid var(--primary)" : "1px solid var(--border)", background: sel ? "rgb(var(--primary-rgb) / 0.2)" : "var(--bg-3)", color: sel ? "var(--text)" : "var(--text-muted)", fontWeight: sel ? 600 : 400, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
                  {sel && <Check size={12} />} {s}
                </button>
              );
            })}
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 8 }}>Changes take effect on your next session</p>
        </Section>

        <Section title="My Exams">
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 10 }}>Switch off exams you don't write — they disappear from every picker across the app.</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ALL_EXAMS.map((ex) => {
              const on = enabledExams.includes(ex);
              return (
                <button key={ex} onClick={() => handleExamToggle(ex)} style={{ padding: "6px 14px", borderRadius: 8, border: on ? "2px solid var(--primary)" : "1px solid var(--border)", background: on ? "rgb(var(--primary-rgb) / 0.2)" : "var(--bg-3)", color: on ? "var(--text)" : "var(--text-muted)", fontWeight: on ? 600 : 400, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
                  {on && <Check size={12} />} {ex}
                </button>
              );
            })}
          </div>
        </Section>

        {/* AI Tutor */}
        <Section title="AI Tutor">
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 10 }}>How should the AI explain things to you?</div>
          <LearningStylePicker uid={user?.uid} />
          <Row label="AI language" value="English" />
        </Section>

        {/* Subscription */}
        <Section title="Subscription">
          {isPro ? (
            <>
              <Row label="Plan" value={`Pro ${profile?.subscription?.plan === "pro_yearly" ? "Yearly" : "Monthly"}`} />
              <Row label="Status" value={<span style={{ color: "#4ADE80", fontWeight: 600 }}>Active ✅</span>} />
              <Row label="Days Remaining" value={`${daysLeft} days`} />
              <button onClick={() => alert("To cancel, contact support@exampadi.com")} style={{ background: "none", border: "none", color: "#FF4D6A", fontSize: 13, cursor: "pointer", padding: "4px 0", fontFamily: "inherit" }}>Cancel Subscription</button>
            </>
          ) : (
            <>
              <Row label="Current Plan" value="Free" />
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
                <div>15 questions/day · 2 subjects · 3 AI messages/day</div>
              </div>
              <button onClick={() => setShowProModal(true)} style={{ padding: "10px 20px", borderRadius: 10, background: "linear-gradient(135deg, var(--primary), var(--accent))", border: "none", color: "var(--text)", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Upgrade to Pro →
              </button>
            </>
          )}
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          {notifPermission !== "granted" && (
            <div style={{ marginBottom: 12 }}>
              <button onClick={requestPermission} style={{
                padding: "8px 16px", borderRadius: 8, background: "var(--primary)",
                border: "none", color: "var(--text)", fontWeight: 600, fontSize: 12,
                cursor: "pointer", fontFamily: "inherit",
              }}>
                Enable Browser Notifications
              </button>
            </div>
          )}
          <ToggleRow label="Daily study reminder" value={preferences.dailyReminder} onChange={v => handlePref("dailyReminder", v)} />
          {preferences.dailyReminder && (
            <Row label="Reminder time">
              <select value={preferences.reminderTime || "18:00"} onChange={e => handlePref("reminderTime", e.target.value)} style={{
                background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 6,
                color: "var(--text)", padding: "6px 10px", fontSize: 13, outline: "none", fontFamily: "inherit",
              }}>
                {["09:00","12:00","15:00","18:00","20:00","22:00"].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Row>
          )}
          <ToggleRow label="Streak alerts" value={preferences.streakAlerts} onChange={v => handlePref("streakAlerts", v)} />
          <ToggleRow label="New questions available" value={preferences.newQuestions} onChange={v => handlePref("newQuestions", v)} />
          <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 8 }}>Notifications work on all modern browsers</p>
        </Section>

        {/* Study Preferences */}
        <Section title="Study Preferences">
          <Row label="Default session length">
            <select value={preferences.sessionLength} onChange={e => handlePref("sessionLength", parseInt(e.target.value))} style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", padding: "6px 10px", fontSize: 13, outline: "none", fontFamily: "inherit" }}>
              {[10, 20, 30, 50].map(n => <option key={n} value={n}>{n} questions</option>)}
            </select>
          </Row>
          <Row label="Question order">
            <select value={preferences.questionOrder} onChange={e => handlePref("questionOrder", e.target.value)} style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", padding: "6px 10px", fontSize: 13, outline: "none", fontFamily: "inherit" }}>
              <option value="random">Random</option>
              <option value="newest">By Year (newest first)</option>
              <option value="difficulty">By Difficulty</option>
            </select>
          </Row>
          <ToggleRow label="Show hints by default" value={preferences.showHints} onChange={v => handlePref("showHints", v)} />
          <ToggleRow label="Auto-advance after answer" value={preferences.autoAdvance} onChange={v => handlePref("autoAdvance", v)} />
        </Section>

        {/* Privacy */}
        <Section title="Privacy">
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
            Download everything ExamPadi holds about you (profile, sessions, notes, AI memory). Limited to once every 24 hours.
          </div>
          <button
            onClick={handleExportData}
            disabled={exporting}
            style={{ padding: "10px 20px", borderRadius: 10, background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text)", fontWeight: 600, fontSize: 13, cursor: exporting ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: exporting ? 0.6 : 1 }}
          >
            {exporting ? "Preparing download…" : "Download my data (JSON)"}
          </button>
        </Section>

        {/* About */}
        <Section title="About">
          <Row label="Version" value={pkg.version || "1.0.0"} />
          <Row label="Contact" value="jadai7065@gmail.com" />
          <Row label="WhatsApp" value="+234 812 763 6057" />
          <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
            <Link to="/terms" style={{ color: "var(--primary)", fontSize: 13, fontWeight: 600 }}>Terms</Link>
            <Link to="/privacy" style={{ color: "var(--primary)", fontSize: 13, fontWeight: 600 }}>Privacy</Link>
            <Link to="/help" style={{ color: "var(--primary)", fontSize: 13, fontWeight: 600 }}>Help</Link>
          </div>
        </Section>

        {/* Danger zone */}
        <Section title="Danger Zone" danger>
          <p style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>These actions are irreversible.</p>
          {!showResetConfirm ? (
            <button onClick={() => setShowResetConfirm(true)} style={{ padding: "10px 20px", borderRadius: 8, background: "transparent", border: "1px solid #FF4D6A", color: "#FF4D6A", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>
              Reset Progress
            </button>
          ) : (
            <div>
              <p style={{ color: "#FF6B6B", fontSize: 12, marginBottom: 8 }}>Type "RESET" to confirm:</p>
              <input value={resetInput} onChange={e => setResetInput(e.target.value)} placeholder="type RESET" style={{ background: "var(--bg-3)", border: "1px solid #FF4D6A", borderRadius: 6, padding: "8px 12px", color: "var(--text)", fontSize: 13, width: "100%", outline: "none", marginBottom: 8, fontFamily: "inherit" }} />
              <button disabled={resetInput !== "RESET"} onClick={handleResetProgress} style={{ padding: "8px 16px", borderRadius: 6, background: resetInput === "RESET" ? "var(--danger)" : "var(--border)", border: "none", color: "var(--text)", fontWeight: 600, cursor: resetInput === "RESET" ? "pointer" : "not-allowed", fontFamily: "inherit", fontSize: 12 }}>
                Confirm Reset
              </button>
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <button onClick={() => alert("Contact support@exampadi.com to delete your account")} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>
              Delete Account
            </button>
          </div>
        </Section>

        {/* Network diagnostic */}
        <Section title="Network Diagnostics" icon={Sliders}>
          <NetworkDiagnostic />
        </Section>
      </div>

      {/* Exam modal */}
      {showExamModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 20, padding: 24, maxWidth: 360, width: "90%" }}>
            <h3 style={{ margin: "0 0 16px", fontWeight: 700 }}>Select Exam Type</h3>
            {EXAM_OPTIONS.map(e => (
              <button key={e} onClick={() => { updateFirestore({ exam: e }); setShowExamModal(false); }} style={{ display: "block", width: "100%", padding: "10px 16px", borderRadius: 8, background: (profile?.exam || "JAMB") === e ? "rgb(var(--primary-rgb) / 0.2)" : "var(--bg-3)", border: (profile?.exam || "JAMB") === e ? "1px solid var(--primary)" : "1px solid #333", color: "#fff", cursor: "pointer", marginBottom: 8, textAlign: "left", fontFamily: "inherit", fontSize: 14 }}>
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
      <ProUpgradeModal open={showProModal} onClose={() => setShowProModal(false)} reason="mock" dismissible />
    </div>
  );
}

function Section({ title, children, danger }) {
  return (
    <div style={{ background: "var(--bg-2)", border: danger ? "1px solid rgba(255,77,106,0.3)" : "1px solid var(--border)", borderRadius: 16, padding: 20, marginBottom: 20 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px", color: danger ? "var(--danger)" : "var(--text)" }}>{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value, children, onClick }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--bg-3)" }}>
      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {children || <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{value}</span>}
        {onClick && <button onClick={onClick} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><ChevronRight size={14} /></button>}
      </div>
    </div>
  );
}

function ToggleRow({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--bg-3)" }}>
      <span style={{ fontSize: 13, color: "var(--text)" }}>{label}</span>
      <Toggle value={value} onChange={onChange} />
    </div>
  );
}