import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { getUserProfile } from "../lib/userProfile";
import Logo from "../components/Logo";
import { Eye, EyeOff } from "lucide-react";
import { captureRefCodeFromUrl, attributePartnerRef } from "../lib/partner";
import { loadBranding } from "../lib/branding";

export default function AuthPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, login, register, resetPassword, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState("signin");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const didRedirect = useRef(false);
  const [branding, setBranding] = useState(null);

  useEffect(() => {
    loadBranding().then((b) => setBranding(b));
  }, []);

  useEffect(() => {
    // Partner Plan: stash ?ref=CODE from a school's referral link.
    captureRefCodeFromUrl();
  }, []);

  useEffect(() => {
    if (user && !didRedirect.current) {
      didRedirect.current = true;
      attributePartnerRef(user).catch(() => {});
      getUserProfile(user.uid)
        .then((profile) => {
          if (profile?.onboarded) {
            navigate("/dashboard", { replace: true });
          } else {
            navigate("/onboarding", { replace: true });
          }
        })
        .catch(() => {
          navigate("/onboarding", { replace: true });
        });
    }
  }, [user, navigate]);

  function validate() {
    const e = {};
    if (mode === "signup" && !form.name.trim()) e.name = "Enter your full name";
    if (!form.email.trim()) e.email = "Enter your email";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Invalid email address";
    if (!form.password) e.password = "Enter your password";
    else if (form.password.length < 6) e.password = "Password must be at least 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);

    try {
      if (mode === "signup") {
        await register(form.email, form.password, form.name);
        toast({ message: `Account created! Welcome, ${form.name}`, type: "success" });
      } else {
        await login(form.email, form.password);
        toast({ message: "Welcome back! Let's practice", type: "success" });
      }
    } catch (err) {
      const code = err.code;
      const msg = code === 'auth/invalid-credential' ? 'Incorrect email or password.'
        : code === 'auth/email-already-in-use' ? 'An account with this email already exists. Sign in instead.'
        : code === 'auth/too-many-requests' ? 'Too many attempts. Try again later.'
        : code === 'auth/user-not-found' ? 'No account found with this email.'
        : code === 'auth/wrong-password' ? 'Incorrect password.'
        : err.message.includes('auth is not enabled') ? 'Email/Password login is not enabled. Ask the admin to enable it in Firebase Console → Authentication.'
        : err.message;
      toast({ message: msg, type: "error" });
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!form.email.trim()) {
      setErrors({ email: "Enter your email address" });
      return;
    }

    setLoading(true);
    try {
      await resetPassword(form.email);
      toast({ message: "Password reset email sent! Check your inbox.", type: "success" });
      setMode("signin");
      setForm(f => ({ ...f, password: "" }));
    } catch (err) {
      toast({ message: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    try {
      await signInWithGoogle();
      toast({ message: "Welcome! Signed in with Google", type: "success" });
    } catch (err) {
      const msg = err.message || "Google sign-in failed";
      toast({ message: msg, type: "error" });
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  }



  const inputStyle = (field) => ({
    width: "100%",
    padding: "14px 16px",
    borderRadius: 10,
    border: `1.5px solid ${errors[field] ? "var(--danger)" : "var(--border)"}`,
    background: "var(--bg-3)",
    color: "var(--text)",
    fontSize: 15,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
    marginBottom: errors[field] ? 4 : 16,
    transition: "border 0.2s",
  });

  return (
    <div style={{
      minHeight: "100vh",
      background: branding?.backgroundImageUrl
        ? `linear-gradient(rgba(7,18,12,0.75), rgba(7,18,12,0.75)), url(${branding.backgroundImageUrl})`
        : "var(--bg)",
      backgroundSize: branding?.backgroundImageUrl ? "cover" : "auto",
      backgroundPosition: branding?.backgroundImageUrl ? "center" : "center",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    }}>
      <div style={{
        width: "100%",
        maxWidth: 420,
        background: "var(--bg-2)",
        border: "1px solid var(--border)",
        borderRadius: 20,
        padding: "40px 32px",
        boxShadow: "var(--card-shadow)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", marginBottom: 12 }}>
            <Logo size={56} radius={16} />
          </div>
          <h1 style={{ color: "var(--text)", fontSize: 24, fontWeight: 800, margin: 0 }}>
            ExamPadi
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            {mode === "signup" ? "Create your account — it's free" : mode === "forgot" ? "Reset your password" : "Welcome back, let's practice"}
          </p>
        </div>

        <div style={{
          display: "flex",
          background: "var(--bg-3)",
          borderRadius: 12,
          padding: 4,
          marginBottom: 24,
        }}>
          {[["signin", "Sign In"], ["signup", "Sign Up"]].map(([m, label]) => (
            <button key={m} onClick={() => { setMode(m); setErrors({}); }}
              style={{
                flex: 1, padding: "10px 0", border: "none", borderRadius: 10,
                background: mode === m ? "var(--primary)" : "transparent",
                color: mode === m ? "#fff" : "var(--text-muted)",
                fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                fontSize: 14, transition: "all 0.2s",
              }}>
              {label}
            </button>
          ))}
        </div>

        {mode === "forgot" && (
          <p style={{ textAlign: "center", marginBottom: 16 }}>
            <button onClick={() => { setMode("signin"); setErrors({}); }}
              style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>
              ← Back to Sign In
            </button>
          </p>
        )}

        {errors.general && (
          <div style={{
            padding: "12px 16px", borderRadius: 10, background: "var(--danger-dim)",
            border: "1px solid var(--danger)", color: "var(--danger)",
            fontSize: 14, marginBottom: 16,
          }}>
            {errors.general}
          </div>
        )}

        {mode === "signup" && (
          <>
            <input
              type="text"
              placeholder="Full name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              style={inputStyle("name")}
            />
            {errors.name && <p style={{ color: "var(--danger)", fontSize: 12, margin: "0 0 12px" }}>{errors.name}</p>}
          </>
        )}

        <input
          type="email"
          placeholder="Email address"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          style={inputStyle("email")}
        />
        {errors.email && <p style={{ color: "var(--danger)", fontSize: 12, margin: "0 0 12px" }}>{errors.email}</p>}

        <div style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder={mode === "signup" ? "Create password (min 6 chars)" : "Password"}
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            style={{ ...inputStyle("password"), paddingRight: 44 }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute",
              right: 14,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              padding: 4,
              display: "flex",
              alignItems: "center",
            }}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.password && <p style={{ color: "var(--danger)", fontSize: 12, margin: "0 0 12px" }}>{errors.password}</p>}

        {mode === "forgot" && (
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
            Enter your email above and we'll send a password reset link.
          </p>
        )}

        {mode === "signin" && (
          <p style={{ textAlign: "right", marginBottom: 16 }}>
            <button
              onClick={() => { setMode("forgot"); setErrors({}); }}
              style={{ background: "none", border: "none", color: "var(--primary)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
            >
              Forgot password?
            </button>
          </p>
        )}

        <button
          onClick={mode === "forgot" ? handleForgotPassword : handleSubmit}
          disabled={loading}
          style={{
            width: "100%", padding: "14px", borderRadius: 12, border: "none",
            background: loading ? "var(--bg-3)" : "var(--primary)",
            color: loading ? "var(--text-muted)" : "#fff",
            fontWeight: 800, fontSize: 16, cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "inherit", marginBottom: 16, transition: "all 0.2s",
          }}>
          {loading ? "Please wait..." : mode === "signup" ? "Create Account" : mode === "forgot" ? "Reset Password" : "Sign In"}
        </button>

        {mode !== "forgot" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              <span style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 600 }}>OR</span>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              style={{
                width: "100%", padding: "14px", borderRadius: 12,
                border: "1.5px solid var(--border)",
                background: "var(--bg-3)",
                color: "var(--text)",
                fontWeight: 700, fontSize: 15,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                transition: "all 0.2s",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          </>
        )}

        <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13, marginTop: 20 }}>
          {mode === "signin"
            ? <>Don't have an account? <button onClick={() => setMode("signup")} style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Sign Up free</button></>
            : <>Already have an account? <button onClick={() => setMode("signin")} style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Sign In</button></>
          }
        </p>
      </div>
    </div>
  );
}