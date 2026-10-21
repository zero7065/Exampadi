// Join a class with an invite code (/join or /join/:code).
import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import { acceptClassInvite, getClassByInvite } from "../../lib/schools";
import { Users, ArrowLeft, CheckCircle, Loader2, AlertCircle } from "lucide-react";

export default function JoinClass() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { code: paramCode } = useParams();
  const [code, setCode] = useState(paramCode || "");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null); // null, 'success', 'error', 'checking'
  const [classInfo, setClassInfo] = useState(null);

  async function checkClass(c) {
    const clean = String(c || "").trim().toUpperCase();
    if (clean.length !== 6) { setStatus('error'); return; }
    setStatus('checking');
    try {
      const info = await getClassByInvite(clean);
      if (info) {
        setClassInfo(info);
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  async function join(c) {
    const clean = String(c || "").trim().toUpperCase();
    if (!clean) { toast({ message: "Enter your class code", type: "warning" }); return; }
    if (clean.length !== 6) { toast({ message: "Class code must be 6 characters", type: "warning" }); return; }
    if (!user) { navigate("/auth", { replace: true }); return; }
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

  useEffect(() => {
    if (paramCode && user && !busy) join(paramCode);
    if (paramCode) checkClass(paramCode);
  }, [paramCode, user]);

  useEffect(() => {
    if (code.length === 6) checkClass(code);
    else { setStatus(null); setClassInfo(null); }
  }, [code]);

  return (
    <div className="page-content max-w-md mx-auto">
      <Link to="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: 14, fontWeight: 600, marginBottom: 24 }}>
        <ArrowLeft size={16} /> Back
      </Link>
      <div className="glass-card p-8 text-center space-y-6 animate-fade-in">
        <div className="relative">
          <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center shrink-0" style={{ background: "var(--landing-gradient)", color: "var(--text)" }}>
            <Users size={28} />
          </div>
          {status === 'checking' && (
            <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-black/50">
              <Loader2 size={24} className="animate-spin text-white" />
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
          <h1 className="text-2xl font-black text-text">Join your class</h1>
          <p className="text-sm text-text-muted">Enter the 6-letter code from your teacher.</p>
          
          {classInfo && status === 'success' && (
            <div className="glass-card p-4 text-left space-y-2 animate-slide-up border-l-4 border-green-500">
              <p className="font-semibold text-text">{classInfo.name}</p>
              <p className="text-sm text-text-muted">{classInfo.subject} \uB7 {classInfo.teacherName || "Your teacher"}</p>
              <p className="text-xs text-text-muted">{classInfo.studentCount || 0} students enrolled</p>
            </div>
          )}

          <input
            value={code}
            onChange={(e) => { const v = e.target.value.toUpperCase().slice(0, 6); setCode(v); if (v.length === 6) checkClass(v); }}
            placeholder="ABC123"
            maxLength={6}
            className="input-field text-center"
            style={{ fontSize: 28, fontWeight: 900, letterSpacing: "0.4em", textTransform: "uppercase" }}
            disabled={busy}
            autoComplete="off"
            autoFocus
          />
          
          {status === 'error' && code.length === 6 && (
            <p className="text-sm text-red-500 animate-shake">Invalid class code. Please check and try again.</p>
          )}

          <button 
            onClick={() => join(code)} 
            disabled={busy || code.length !== 6 || status === 'checking'}
            className="btn-primary w-full disabled:opacity-60 py-4"
            style={{ fontSize: 16 }}
          >
            {busy ? <><Loader2 size={18} className="animate-spin" /> Joining\u2026</> : 
             status === 'success' ? <><CheckCircle size={18} /> Join {classInfo?.name || "Class"}</> : 
             "Join class"}
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