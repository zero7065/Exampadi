// Teacher Portal — a distinct, official signup/login for teachers.
// Creates a teacher account (role "teacher") separate from student accounts.
// A student account can never be upgraded here — teachers are their own account.
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { getUserProfile } from "../lib/userProfile";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { GraduationCap, Mail, Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

export default function TeacherAuthPage() {
  const { user, register, login, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState("signup"); // signup | login
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // If already signed in as a teacher, go straight to the dashboard.
  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid).then((p) => {
      if (p?.role === "teacher" || p?.role === "admin") navigate("/teacher", { replace: true });
    }).catch(() => {});
  }, [user, navigate]);

  async function handleSubmit() {
    setError("");
    if (!form.email.trim() || !form.password) { setError("Enter your email and password"); return; }
    if (mode === "signup" && !form.name.trim()) { setError("Enter your full name"); return; }
    if (mode === "signup" && form.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      if (mode === "signup") {
        await register(form.email.trim(), form.password, form.name.trim(), {
          username: form.email.split("@")[0],
          accountType: "teacher",
        });
        toast({ message: "Teacher account created — welcome!", type: "success" });
      } else {
        await login(form.email.trim(), form.password);
        toast({ message: "Welcome back, teacher!", type: "success" });
      }
      navigate("/teacher", { replace: true });
    } catch (e) {
      const msg = e.code === "auth/email-already-in-use" ? "This email already has an account. Try logging in instead."
        : e.code === "auth/invalid-credential" || e.code === "auth/wrong-password" ? "Incorrect email or password."
        : e.message || "Something went wrong";
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
        // First-time Google user on the teacher portal → create a teacher profile.
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
        setError("This Google account is a student account. Teachers need a separate account — sign out and use a different email, or use email + password below.");
      }
    } catch (e) {
      setError(e.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  }

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
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                style={{ flex: 1, padding: "10px 0", border: "none", borderRadius: 10, background: mode === m ? "var(--accent)" : "transparent", color: mode === m ? "#04120D" : "rgba(255,255,255,0.7)", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                {label}
              </button>
            ))}
          </div>

          {mode === "signup" && (
            <div style={{ position: "relative", marginBottom: 12 }}>
              <User size={16} style={{ position: "absolute", left: 14, top: 15, color: "rgba(255,255,255,0.5)" }} />
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" style={{ width: "100%", padding: "13px 14px 13px 40px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
          )}
          <div style={{ position: "relative", marginBottom: 12 }}>
            <Mail size={16} style={{ position: "absolute", left: 14, top: 15, color: "rgba(255,255,255,0.5)" }} />
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email address" style={{ width: "100%", padding: "13px 14px 13px 40px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ position: "relative", marginBottom: 16 }}>
            <Lock size={16} style={{ position: "absolute", left: 14, top: 15, color: "rgba(255,255,255,0.5)" }} />
            <input type={showPw ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} onKeyDown={(e) => e.key === "Enter" && handleSubmit()} placeholder="Password" style={{ width: "100%", padding: "13px 40px 13px 40px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: 13, background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
          </div>

          {error && <p style={{ color: "#FF6B6B", fontSize: 12, marginBottom: 12, lineHeight: 1.5 }}>{error}</p>}

          <button onClick={handleSubmit} disabled={loading} style={{ width: "100%", padding: 14, borderRadius: 12, background: "var(--accent)", border: "none", color: "#04120D", fontWeight: 800, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {loading ? "Please wait…" : mode === "signup" ? "Create teacher account" : "Log in"} <ArrowRight size={16} />
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0" }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.12)" }} />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>or</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.12)" }} />
          </div>
          <button onClick={handleGoogle} disabled={loading} style={{ width: "100%", padding: 13, borderRadius: 12, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span style={{ fontWeight: 900 }}>G</span> Continue with Google
          </button>

          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 16, lineHeight: 1.6, textAlign: "center" }}>
            <ShieldCheck size={11} style={{ display: "inline", marginRight: 3 }} />
            Teacher accounts are separate from student accounts. A student account can't be turned into a teacher account.
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