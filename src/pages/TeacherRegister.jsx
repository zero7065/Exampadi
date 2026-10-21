import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { redeemTeacherInvite } from "../lib/teacherInvites";
import { GraduationCap, ArrowLeft, CheckCircle } from "lucide-react";

export default function TeacherRegister() {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [redeemed, setRedeemed] = useState(null);

  async function handleRedeem() {
    if (!code.trim()) {
      toast({ message: "Enter your invite code", type: "warning" });
      return;
    }
    setLoading(true);
    try {
      const invite = await redeemTeacherInvite(code.trim());
      await refreshProfile?.();
      setRedeemed(invite);
      toast({ message: "Welcome, Teacher! Your account is ready.", type: "success" });
    } catch (e) {
      toast({ message: e.message, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  if (redeemed) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div className="glass-card" style={{ maxWidth: 480, width: "100%", padding: 40, textAlign: "center" }}>
          <CheckCircle size={48} color="#4ADE80" style={{ margin: "0 auto 16px" }} />
          <h2 style={{ color: "var(--text)", fontSize: 24, fontWeight: 800, marginBottom: 8 }}>You're a Teacher!</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 24 }}>
            School: <strong>{redeemed.schoolName}</strong>
          </p>
          <button onClick={() => navigate("/teacher")} className="btn-primary" style={{ width: "100%", padding: 14 }}>
            Go to Teacher Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="glass-card" style={{ maxWidth: 480, width: "100%", padding: 40 }}>
        <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, marginBottom: 16, fontSize: 13 }}>
          <ArrowLeft size={16} /> Back
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <GraduationCap size={32} color="var(--primary)" />
          <h1 style={{ color: "var(--text)", fontSize: 24, fontWeight: 800, margin: 0 }}>Teacher Registration</h1>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 24 }}>
          Enter the invite code provided by your school administrator to activate your teacher account.
        </p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="TEACH-XXXX-XXXX"
          style={{ width: "100%", padding: "14px 16px", borderRadius: 12, background: "var(--bg-3)", border: "1px solid #333", color: "#fff", fontSize: 16, fontWeight: 700, letterSpacing: 2, textAlign: "center", outline: "none", marginBottom: 16, boxSizing: "border-box" }}
        />
        <button
          onClick={handleRedeem}
          disabled={loading}
          className="btn-primary"
          style={{ width: "100%", padding: 14, opacity: loading ? 0.6 : 1 }}
        >
          {loading ? "Verifying..." : "Activate Teacher Account"}
        </button>
      </div>
    </div>
  );
}
