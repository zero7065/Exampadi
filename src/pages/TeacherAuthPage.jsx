// Teacher Portal — a distinct, official signup/login for teachers.
// Sign up with USERNAME OR EMAIL + password. A teacher account can never reuse
// an email or username that already belongs to a student (or anyone else).
// Google sign-in is hidden under "Other sign-in methods" until requested.
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { getUserProfile } from "../lib/userProfile";
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { GraduationCap, Mail, Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck, Sparkles, ChevronDown } from "lucide-react";

function toEmail(identifier) {
  const v = String(identifier || "").trim();
  if (!v) return "";
  return v.includes("@") ? v.toLowerCase() : `${v.toLowerCase()}@exampadi.local`;
}

export default function TeacherAuthPage() {
  const { user, register, login, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState("signup"); // signup | login
  const [form, setForm] = useState({ name: "", identifier: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [showOther, setShowOther] = useState(false); // Google hidden by default
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid).then((p) => {
      if (p?.role === "teacher" || p?.role === "admin") navigate("/teacher", { replace: true });
    }).catch(() => {});
  }, [user, navigate]);

  // Ensure the identifier isn't already used by ANY account (student or otherwise).
  async function assertAvailable(identifier) {
    const email = toEmail(identifier);
    const uname = identifier.includes("@") ? "" : identifier.trim().toLowerCase();
    const cols = ["users"];
    for (const col of cols) {
      if (uname) {
        const byName = await getDocs(query(collection(db, col), where("username", "==", uname), limit(1))).catch(() => ({ empty: true }));
        if (!byName.empty) throw new Error(`The username "${uname}" is already taken. Choose another.`);
      }
      const byEmail = await getDocs(query(collection(db, col), where("email", "==", email), limit(1))).catch(() => ({ empty: true }));
      if (!byEmail.empty) throw new Error(`The email "${email}" is already registered. Teachers need a separate account — try another email or log in.`);
    }
  }

  async function handleSubmit(e) {
    e?.preventDefault?.();
    setError("");
    const id = form.identifier.trim();
    if (!id) { setError("Enter your username or email"); return; }
    if (!form.password) { setError("Enter your password"); return; }
    if (mode === "signup" && !form.name.trim()) { setError("Enter your full name"); return; }
    if (mode === "signup" && form.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      if (mode === "signup") {
        await assertAvailable(id);
        await register(toEmail(id), form.password, form.name.trim(), {
          username: id.includes("@") ? id.split("@")[0] : id,
          accountType: "teacher",
        });
        toast({ message: "Teacher account created — welcome!", type: "success" });
      } else {
        await login(toEmail(id), form.password);
        toast({ message: "Welcome back, teacher!", type: "success" });
      }
      navigate("/teacher", { replace: true });
    } catch (err) {
      const msg = err.code === "auth/email-already-in-use" ? "This email already has an account. Try logging in instead."
        : err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" ? "Incorrect username/email or password."
        : err.code === "auth/user-not-found" ? "No account found. Create a teacher account first."
        : err.message || "Something went wrong";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setLoading(true);
    try {
      const cred = await signInWithGoogle();
      const uid = cred.user.uid;
      const p = await getUserProfile(uid);
      if (!p) {
        await setDoc(doc(db, "users", uid), {
          email: cred.user.email,
          name: cred.user.displayName || "Teacher",
          username: (cred.user.email || "teacher").split("@")[0].toLowerCase(),
          role: "teacher",
          accountType: "teacher",
          onboarded: false,
          createdAt: serverTimestamp(),
        }, { merge: true });
        navigate("/teacher", { replace: true });
      } else if (p.role === "teacher" || p.role === "admin") {
        navigate("/teacher", { replace: true });
      } else {
        setError("This Google account is a student account. Teachers need a separate account — use a different email or sign up with username + password.");
      }
    } catch (err) {
      setError(err.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = { width: "100%", padding: "13px 14px 13px 40px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "linear-gradient(150deg, #0b1020 0%, #1a1b3a 55%, #2d1b4e 100%)" }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, margin: "0 auto 12px", background: "linear-gradient(135deg, var(--accent), var(--primary))", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <GraduationCap size={32} color="#04120D" />
          </div>
          <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 900, margin: 0 }}>Teacher Portal</h1>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 4 }}>A dedicated account for teachers — separate from students.</p>
        </div>

        <div className="glass-card" style={{ padding: 28, background: "rgba(20,22,40,0.85)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "flex", background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: 4, marginBottom: 20 }}>
            {[["signup", "Create teacher account"], ["login", "Teacher login"]].map(([m, label]) => (
              <button key={m} type="button" onClick={() => { setMode(m); setError(""); }}
                style={{ flex: 1, padding: "10px 0", border: "none", borderRadius: 10, background: mode === m ? "var(--accent)" : "transparent", color: mode === m ? "#04120D" : "rgba(255,255,255,0.7)", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {mode === "signup" && (
              <div style={{ position: "relative", marginBottom: 12 }}>
                <User size={16} style={{ position: "absolute", left: 14, top: 15, color: "rgba(255,255,255,0.5)" }} />
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" style={inputStyle} />
              </div>
            )}
            <div style={{ position: "relative", marginBottom: 12 }}>
              <Mail size={16} style={{ position: "absolute", left: 14, top: 15, color: "rgba(255,255,255,0.5)" }} />
              <input value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} placeholder="Username or email address" autoComplete="username" style={inputStyle} />
            </div>
            <div style={{ position: "relative", marginBottom: 16 }}>
              <Lock size={16} style={{ position: "absolute", left: 14, top: 15, color: "rgba(255,255,255,0.5)" }} />
              <input type={showPw ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password" autoComplete={mode === "signup" ? "new-password" : "current-password"} style={{ ...inputStyle, paddingRight: 40 }} />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: 13, background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>

            {error && <p style={{ color: "#FF6B6B", fontSize: 12, marginBottom: 12, lineHeight: 1.5 }}>{error}</p>}

            <button type="submit" disabled={loading} style={{ width: "100%", padding: 14, borderRadius: 12, background: "var(--accent)", border: "none", color: "#04120D", fontWeight: 800, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {loading ? "Please wait…" : mode === "signup" ? "Create teacher account" : "Log in"} <ArrowRight size={16} />
            </button>
          </form>

          {/* Other sign-in methods — hidden until requested */}
          <button type="button" onClick={() => setShowOther((s) => !s)} style={{ width: "100%", marginTop: 16, padding: "10px", background: "none", border: "none", color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            Other sign-in methods <ChevronDown size={14} style={{ transform: showOther ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
          </button>
          {showOther && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "12px 0" }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.12)" }} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>or</span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.12)" }} />
              </div>
              <button type="button" onClick={handleGoogle} disabled={loading} style={{ width: "100%", padding: 13, borderRadius: 12, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span style={{ fontWeight: 900 }}>G</span> Continue with Google
              </button>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 10, lineHeight: 1.5 }}>
                Google sign-in creates a separate account. You can't reuse a student's email.
              </p>
            </div>
          )}

          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 16, lineHeight: 1.6, textAlign: "center" }}>
            <ShieldCheck size={11} style={{ display: "inline", marginRight: 3 }} />
            Teacher accounts are separate from student accounts. A student's email or username can't be reused.
          </p>
        </div>

        <div style={{ textAlign: "center", marginTop: 16, display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/auth" style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600 }}>Student sign in →</Link>
          <Link to="/teacher/register" style={{ color: "var(--accent)", fontSize: 13, fontWeight: 700 }}><Sparkles size={12} style={{ display: "inline" }} /> Have a teacher invite code?</Link>
        </div>
      </div>
    </div>
  );
}