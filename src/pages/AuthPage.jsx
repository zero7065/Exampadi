import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { getUserProfile } from "../lib/userProfile";
import Logo from "../components/Logo";
import { Eye, EyeOff, HelpCircle, User, Lock, Building2, Key } from "lucide-react";
import { captureRefCodeFromUrl, attributePartnerRef } from "../lib/partner";
import { loadBranding } from "../lib/branding";

export default function AuthPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, login, register, resetPassword, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState("signin");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    username: "",
    name: "",
    email: "",
    password: "",
    schoolCode: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const didRedirect = useRef(false);
  const [branding, setBranding] = useState(null);
  const [recoveryStep, setRecoveryStep] = useState("name"); // name | pin | reset

  useEffect(() => {
    loadBranding().then((b) => setBranding(b));
  }, []);

  useEffect(() => {
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

  function validateSignup() {
    const e = {};
    if (!form.name.trim()) e.name = "Enter your full name";
    else if (form.name.trim().length < 2) e.name = "Name must be at least 2 characters";
    if (!form.username.trim()) e.username = "Choose a username";
    else if (form.username.trim().length < 3) e.username = "Username must be at least 3 characters";
    else if (!/^[a-zA-Z0-9_]+$/.test(form.username.trim())) e.username = "Username can only contain letters, numbers, and underscores";
    if (!form.password) e.password = "Create a password";
    else if (form.password.length < 6) e.password = "Password must be at least 6 characters";
    else if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      e.password = "Password must include at least one letter and one number";
    }
    if (!form.confirmPassword) e.confirmPassword = "Confirm your password";
    else if (form.confirmPassword !== form.password) e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateSignin() {
    const e = {};
    if (!form.username.trim()) e.username = "Enter your username or email";
    if (!form.password) e.password = "Enter your password";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSignup() {
    if (!validateSignup()) return;
    setLoading(true);
    try {
      await register(form.email || `${form.username}@exampadi.local`, form.password, form.name, {
        username: form.username.trim(),
        schoolCode: form.schoolCode.trim() || undefined,
      });
      toast({ message: `Account created! Welcome, ${form.name}`, type: "success" });
    } catch (err) {
      const msg = err.code === "SEATS_FULL" ? "This school code has reached its seat limit. Contact your teacher."
        : err.code === "CODE_EXPIRED" ? "This school code has expired. Ask your teacher for a new one."
        : err.code === "CODE_REVOKED" ? "This school code has been revoked."
        : err.code === "USERNAME_TAKEN" ? "Username already taken. Please choose another."
        : err.message;
      toast({ message: msg, type: "error" });
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  }

  async function handleSignin() {
    if (!validateSignin()) return;
    setLoading(true);
    try {
      await login(form.username.trim(), form.password);
      toast({ message: "Welcome back! Let's practice", type: "success" });
    } catch (err) {
      const passLen = form.password.length;
      const hint = passLen >= 5 ? `Hint: password starts with "${form.password.slice(0, 2)}…${form.password.slice(-2)}"` : "";
      const msg = err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
        ? `Incorrect username or password. ${hint}`
        : err.code === 'auth/user-not-found' ? "No account found with this username or email."
        : err.code === 'auth/too-many-requests' ? "Too many attempts. Try again later."
        : err.code === 'auth auth is not enabled' ? 'Email/Password login is not enabled.'
        : err.message;
      toast({ message: msg, type: "error" });
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!form.username.trim()) {
      setErrors({ username: "Enter your username or email to start recovery" });
      return;
    }
    setLoading(true);
    try {
      const profile = await getUserProfileByUsername(form.username.trim());
      if (!profile) {
        setErrors({ general: "No account found with this username or email." });
        return;
      }
      setRecoveryStep("pin");
      toast({ message: "Enter your 6-digit recovery PIN", type: "info" });
    } catch (err) {
      toast({ message: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyPin() {
    setLoading(true);
    try {
      // PIN verification happens server-side via /api/auth/verify-pin
      const res = await fetch("/api/auth/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.username.trim(), pin: form.pin || "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid PIN");
      setRecoveryStep("reset");
      toast({ message: "PIN verified. Set your new password.", type: "success" });
    } catch (err) {
      toast({ message: err.message || "Invalid PIN. Contact your teacher.", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!form.password || form.password.length < 6) {
      setErrors({ password: "Password must be at least 6 characters" });
      return;
    }
    setLoading(true);
    try {
      await resetPassword(form.email || `${form.username}@exampadi.local`, form.password);
      toast({ message: "Password reset successfully!", type: "success" });
      setRecoveryStep("name");
      setMode("signin");
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
      toast({ message: err.message || "Google sign-in failed", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function getUserProfileByUsername(usernameOrEmail) {
    // Look up by email or username in Firestore
    try {
      const q = require("../lib/userProfile").findByUsername || null;
      if (q) return q(usernameOrEmail);
    } catch {}
    return null;
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
        ? `linear-gradient(rgba(244,241,234,0.75), rgba(244,241,234,0.75)), url(${branding.backgroundImageUrl})`
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
            {mode === "signup" ? "Create your account — it's free" : mode === "forgot" ? "Account Recovery" : "Welcome back"}
          </p>
        </div>

        {mode === "forgot" && recoveryStep === "name" && (
          <>
            <div style={{ display: "flex", background: "var(--bg-3)", borderRadius: 12, padding: 4, marginBottom: 24 }}>
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

            <p style={{ textAlign: "center", marginBottom: 16 }}>
              <button onClick={() => { setMode("signin"); setErrors({}); }}
                style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>
                ← Back to Sign In
              </button>
            </p>

            {errors.general && (
              <div style={{
                padding: "12px 16px", borderRadius: 10, background: "var(--danger-dim)",
                border: "1px solid var(--danger)", color: "var(--danger)",
                fontSize: 14, marginBottom: 16,
              }}>
                {errors.general}
              </div>
            )}

            <input
              type="text"
              placeholder="Username or email address"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              style={inputStyle("username")}
            />
            {errors.username && <p style={{ color: "var(--danger)", fontSize: 12, margin: "0 0 12px" }}>{errors.username}</p>}

            <button
              onClick={handleForgotPassword}
              disabled={loading}
              style={{
                width: "100%", padding: "14px", borderRadius: 12, border: "none",
                background: loading ? "var(--bg-3)" : "var(--primary)",
                color: loading ? "var(--text-muted)" : "#fff",
                fontWeight: 800, fontSize: 16, cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit", marginBottom: 16,
              }}>
              {loading ? "Checking…" : "Find My Account"}
            </button>
          </>
        )}

        {mode === "forgot" && recoveryStep === "pin" && (
          <>
            <p style={{ textAlign: "center", marginBottom: 20, color: "var(--text-muted)", fontSize: 13 }}>
              Enter your 6-digit recovery PIN sent to you
            </p>
            <button onClick={() => { setRecoveryStep("name"); }}
              style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 12, marginBottom: 20, textAlign: "left", paddingLeft: 0 }}>
              ← Try another way
            </button>

            {errors.general && (
              <div style={{
                padding: "12px 16px", borderRadius: 10, background: "var(--danger-dim)",
                border: "1px solid var(--danger)", color: "var(--danger)",
                fontSize: 14, marginBottom: 16,
              }}>
                {errors.general}
              </div>
            )}

            <input
              type="text"
              placeholder="123456"
              maxLength="6"
              value={form.pin || ""}
              onChange={e => setForm(f => ({ ...f, pin: e.target.value }))}
              style={{ ...inputStyle("pin"), letterSpacing: "8px", fontSize: 20 }}
            />

            <button
              onClick={handleVerifyPin}
              disabled={loading}
              style={{
                width: "100%", padding: "14px", borderRadius: 12, border: "none",
                background: loading ? "var(--bg-3)" : "var(--primary)",
                color: loading ? "var(--text-muted)" : "#fff",
                fontWeight: 800, fontSize: 16, cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit", marginBottom: 16,
              }}>
              {loading ? "Verifying…" : "Verify PIN"}
            </button>
          </>
        )}

        {mode === "forgot" && recoveryStep === "reset" && (
          <>
            <p style={{ textAlign: "center", marginBottom: 20, color: "var(--text-muted)", fontSize: 13 }}>
              Create your new password
            </p>
            <button onClick={() => { setRecoveryStep("name"); }}
              style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 12, marginBottom: 20, textAlign: "left", paddingLeft: 0 }}>
              ← Try another way
            </button>

            {errors.password && <p style={{ color: "var(--danger)", fontSize: 12, margin: "0 0 12px" }}>{errors.password}</p>}

            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="New password (min 6 chars)"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                style={{ ...inputStyle("password"), paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute", right: 14, top: "50%",
                  transform: "translateY(-50%)", background: "none", border: "none",
                  cursor: "pointer", color: "var(--text-muted)", padding: 4,
                  display: "flex", alignItems: "center",
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              onClick={handleResetPassword}
              disabled={loading}
              style={{
                width: "100%", padding: "14px", borderRadius: 12, border: "none",
                background: loading ? "var(--bg-3)" : "var(--primary)",
                color: loading ? "var(--text-muted)" : "#fff",
                fontWeight: 800, fontSize: 16, cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit", marginBottom: 16,
              }}>
              {loading ? "Resetting…" : "Reset Password"}
            </button>
          </>
        )}

        {mode !== "forgot" && (
          <>
            <div style={{ display: "flex", background: "var(--bg-3)", borderRadius: 12, padding: 4, marginBottom: 24 }}>
              {[["signin", "Sign In"], ["signup", "Sign Up"]].map(([m, label]) => (
                <button key={m} onClick={() => { setMode(m); setErrors({}); }}
                  style={{
                    flex: 1, padding: "10px 0", border: "none", borderRadius: 10,
                    background: mode === m ? "var(--primary)" : "transparent",
                    color: mode === m ? "var(--text)" : "var(--text-muted)",
                    fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    fontSize: 14, transition: "all 0.2s",
                  }}>
                  {label}
                </button>
              ))}
            </div>

            {mode === "signup" && (
              <>
                <input
                  type="text"
                  placeholder="Full legal name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  style={inputStyle("name")}
                />
                {errors.name && <p style={{ color: "var(--danger)", fontSize: 12, margin: "0 0 12px" }}>{errors.name}</p>}

                <input
                  type="text"
                  placeholder="Username (e.g., ada_lovelace)"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  style={inputStyle("username")}
                />
                {errors.username && <p style={{ color: "var(--danger)", fontSize: 12, margin: "0 0 12px" }}>{errors.username}</p>}

                <input
                  type="email"
                  placeholder="Email address (optional)"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  style={inputStyle("email")}
                />

                <input
                  type="text"
                  placeholder="School code (optional — ask your teacher)"
                  value={form.schoolCode}
                  onChange={e => setForm(f => ({ ...f, schoolCode: e.target.value }))}
                  style={inputStyle("schoolCode")}
                />

                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Create password (min 6 chars)"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    style={{ ...inputStyle("password"), paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute", right: 14, top: "50%",
                      transform: "translateY(-50%)", background: "none", border: "none",
                      cursor: "pointer", color: "var(--text-muted)", padding: 4,
                      display: "flex", alignItems: "center",
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <p style={{ color: "var(--danger)", fontSize: 12, margin: "0 0 12px" }}>{errors.password}</p>}

                <div style={{ position: "relative" }}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm password"
                    value={form.confirmPassword}
                    onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    style={{ ...inputStyle("confirmPassword"), paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: "absolute", right: 14, top: "50%",
                      transform: "translateY(-50%)", background: "none", border: "none",
                      cursor: "pointer", color: "var(--text-muted)", padding: 4,
                      display: "flex", alignItems: "center",
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.confirmPassword && <p style={{ color: "var(--danger)", fontSize: 12, margin: "0 0 12px" }}>{errors.confirmPassword}</p>}
              </>
            )}

{mode === "signin" && (
              <>
                <input
                  type="text"
                  placeholder="Username or email address"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  style={inputStyle("username")}
                />
                {errors.username && <p style={{ color: "var(--danger)", fontSize: 12, margin: "0 0 12px" }}>{errors.username}</p>}

                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    style={inputStyle("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute", right: 14, top: "50%",
                      transform: "translateY(-50%)", background: "none", border: "none",
                      cursor: "pointer", color: "var(--text-muted)", padding: 4,
                      display: "flex", alignItems: "center",
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <p style={{ color: "var(--danger)", fontSize: 12, margin: "0 0 12px" }}>{errors.password}</p>}

                <p style={{ textAlign: "right", marginBottom: 16 }}>
                  <button
                    onClick={() => { setMode("forgot"); setRecoveryStep("name"); setErrors({}); }}
                    style={{ background: "none", border: "none", color: "var(--primary)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Forgot password?
                  </button>
                </p>

            {errors.general && (
              <div style={{
                padding: "12px 16px", borderRadius: 10, background: "var(--danger-dim)",
                border: "1px solid var(--danger)", color: "var(--danger)",
                fontSize: 14, marginBottom: 16,
              }}>
                {errors.general}
              </div>
            )}

            <button
              onClick={mode === "forgot" ? handleForgotPassword : (mode === "signup" ? handleSignup : handleSignin)}
              disabled={loading}
              style={{
                width: "100%", padding: "14px", borderRadius: 12, border: "none",
                background: loading ? "var(--bg-3)" : "var(--primary)",
                color: loading ? "var(--text-muted)" : "#fff",
                fontWeight: 800, fontSize: 16, cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit", marginBottom: 16,
              }}>
              {loading ? "Please wait…" : mode === "signup" ? "Create Account" : mode === "forgot" ? "Reset Password" : "Sign In"}
            </button>

            {mode !== "forgot" && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
                  <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                  <span style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 600 }}>OR</span>
                  <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                </div>

                {mode === "signup" && (
                <>
                  <div style={{ marginBottom: 16, textAlign: "center" }}>
                    <button
                      onClick={() => setMode("signin")}
                      style={{
                        width: "100%", padding: "10px", borderRadius: 10,
                        border: "none", background: "transparent",
                        color: "var(--text-muted)", fontSize: 12, cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      Already have an account? Sign in with email & password
                    </button>
                  </div>
                </>
              )}

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
                  <User size={16} />
                  <span style={{ fontWeight: 600 }}>Continue with Google</span>
                </button>
              </>
            )}
          </>
        )}
      </>
    )}

    <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13, marginTop: 20 }}>
      {mode === "signin" && !loading
        ? <>Don't have an account? <button onClick={() => { setMode("signup"); setErrors({}); }} style={{ background: "none", border: "none", color: "var(--text)", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Sign Up free</button></>
        : mode === "signup" && !loading
        ? <>Already have an account? <button onClick={() => { setMode("signin"); setErrors({}); }} style={{ background: "none", border: "none", color: "var(--text)", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Sign In</button></>
        : null}
    </p>
      </div>
    </div>
  );
}