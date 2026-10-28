// Join a class with an invite code OR a school/teacher code (/join or /join/:code).
// Supports class invites (6 chars) and school codes (8 chars, seat-capped).
import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import { acceptClassInvite, getClassByInvite } from "../../lib/schools";
import { apiUrl } from "../../lib/apiBase";
import { Users, ArrowLeft, CheckCircle, Loader2, AlertCircle, Building2 } from "lucide-react";

export default function JoinClass() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { code: paramCode } = useParams();
  const [code, setCode] = useState(paramCode || "");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null); // null, 'success', 'error', 'checking'
  const [classInfo, setClassInfo] = useState(null);
  const [codeType, setCodeType] = useState(null); // 'class' | 'school'

  function isSchoolCode(c) {
    const clean = String(c || "").trim();
    return clean.length === 8 && /^[A-Z0-9]+$/.test(clean);
  }

  async function checkClass(c) {
    const clean = String(c || "").trim().toUpperCase();
    if (clean.length !== 6) { setStatus('error'); return; }
    setStatus('checking');
    try {
      const info = await getClassByInvite(clean);
      if (info) {
        setClassInfo(info);
        setStatus('success');
        setCodeType('class');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  async function redeemSchoolCode(c) {
    const clean = String(c || "").trim().toUpperCase();
    if (!user) { navigate("/auth", { replace: true }); return; }
    setBusy(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(apiUrl("/api/redeem-teacher-code"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: clean }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Redemption failed");
      toast({ message: "School code redeemed! Welcome to your school.", type: "success" });
      setStatus('success');
      setCodeType('school');
      navigate("/dashboard", { replace: true });
    } catch (e) {
      const msg = e.code || e.message || "Invalid or expired school code";
      toast({ message: msg, type: "error" });
      setStatus('error');
    } finally {
      setBusy(false);
    }
  }

  async function join(c) {
    const clean = String(c || "").trim().toUpperCase();
    if (!clean) { toast({ message: "Enter your class or school code", type: "warning" }); return; }
    if (!user) { navigate("/auth", { replace: true }); return; }

    if (isSchoolCode(clean)) {
      await redeemSchoolCode(clean);
      return;
    }

    if (clean.length !== 6) { toast({ message: "Class code must be 6 characters", type: "warning" }); return; }

    setBusy(true);
    try {
      await acceptClassInvite(clean);
      toast({ message: "Welcome to your class! \uD83C\uDF93", type: "success" });
      navigate("/dashboard", { replace: true });
    } catch (e) {
      toast({ message: e.message || "Could not join class", type: "error" });
    } finally {
      setBusy(false);
    }
  }


  return (
    <div className="page-content max-w-md mx-auto">
      <Link to="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: 14, fontWeight: 600, marginBottom: 24 }}>
        <ArrowLeft size={16} /> Back
      </Link>
      <div className="glass-card p-8 text-center space-y-6 animate-fade-in">
        <div className="relative">
          <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center shrink-0" style={{ background: "var(--landing-gradient)", color: "var(--text)" }}>
            {codeType === 'school' ? <Building2 size={28} /> : <Users size={28} />}
          </div>
          {status === 'checking' && (
            <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-black/50">
              <Loader2 size={24} className="animate-spin text-ash-900" />
            </div>
          )}
          {status === 'success' && (
            <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-green-500/20">
              <CheckCircle size={24} className="text-green-500" />
            </div>
          )}
          {status === 'error' && (
            <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-red-500/20">
              <AlertCircle size={24} className="text-red-500" />
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-black text-text">
            {codeType === 'school' ? "Join your school" : "Join your class"}
          </h1>
          <p className="text-sm text-text-muted">
            {codeType === 'school'
              ? "Enter the 8-character school code from your teacher"
              : "Enter the 6-letter class code from your teacher."}
          </p>

          {classInfo && status === 'success' && codeType === 'class' && (
            <div className="glass-card p-4 text-left space-y-2 animate-slide-up border-l-4 border-green-500">
              <p className="font-semibold text-text">{classInfo.name}</p>
              <p className="text-sm text-text-muted">{classInfo.subject} \uB7 {classInfo.teacherName || "Your teacher"}</p>
              <p className="text-xs text-text-muted">{classInfo.studentCount || 0} students enrolled</p>
            </div>
          )}

          <input
            value={code}
            onChange={(e) => {
              const value = e.target.value.toUpperCase().slice(0, 8);
              setCode(value);
              if (value.length === 6) {
                setCodeType("class");
                checkClass(value);
              } else if (isSchoolCode(value)) {
                setClassInfo(null);
                setCodeType("school");
                setStatus("success");
              } else {
                setClassInfo(null);
                setCodeType(null);
                setStatus(null);
              }
            }}
            placeholder={codeType === 'school' ? "ABCD1234" : "ABC123"}
            maxLength={8}
            className="input-field text-center"
            style={{ fontSize: 28, fontWeight: 900, letterSpacing: "0.4em", textTransform: "uppercase" }}
            disabled={busy}
            autoComplete="off"
            autoFocus
          />

          {status === 'error' && ((code.length === 6 && codeType === 'class') || codeType === 'school') && (
            <p className="text-sm text-red-500 animate-shake">
              {codeType === 'school'
                ? "Invalid or expired school code. Seat may be full."
                : "Invalid class code. Please check and try again."}
            </p>
          )}

          <button
            onClick={() => join(code)}
            disabled={busy || !code || (codeType === 'class' && code.length !== 6) || (codeType === 'school' && code.length !== 8) || status === 'checking'}
            className="btn-primary w-full disabled:opacity-60 py-4"
            style={{ fontSize: 16 }}
          >
            {busy ? <><Loader2 size={18} className="animate-spin" /> Processing\u2026</> :
             status === 'success' ? <><CheckCircle size={18} /> {codeType === 'school' ? "Enter School" : `Join ${classInfo?.name || "Class"}`}</> :
             codeType === 'school' ? "Redeem School Code" : "Join class"}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.5s ease-out; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.3s ease-out; }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        .animate-shake { animation: shake 0.4s ease-in-out; }
      `}</style>
    </div>
  );
}
