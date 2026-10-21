// src/pages/ProfilePage.jsx — header card, academics, stats, achievements, danger zone.
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSubscription } from "../hooks/useSubscription";
import { useToast } from "../components/Toast";
import { getUserProfile, updateUserProfile } from "../lib/userProfile";
import { softDeleteAccount } from "../lib/compliance";
import { ACHIEVEMENTS } from "../config/achievements";
import AvatarDisplay from "../components/Avatar/AvatarDisplay";
import AvatarPicker from "../components/Avatar/AvatarPicker";
import {
  Crown, LogOut, AlertTriangle, Trash2, Pencil, X, Check,
  Flame, Star, BookOpen, Target, GraduationCap, School,
} from "lucide-react";
import { updateProfile } from "firebase/auth";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { isPro } = useSubscription();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [editingSchool, setEditingSchool] = useState(false);
  const [schoolInput, setSchoolInput] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      getUserProfile(user.uid).then((p) => {
        setProfile(p);
        setNameInput(user.displayName || p?.name || "");
        setSchoolInput(p?.school || "");
      }).catch(() => {});
    }
  }, [user]);

  const answered = profile?.totalQuestionsAnswered || 0;
  const correct = profile?.totalCorrect || 0;
  const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;
  const unlocked = profile?.achievements || [];

  async function saveName() {
    const name = nameInput.trim();
    if (!name || !user) { setEditingName(false); return; }
    try {
      await updateProfile(user, { displayName: name });
      await updateUserProfile(user.uid, { name });
      setProfile((p) => ({ ...(p || {}), name }));
      toast({ message: "Display name updated", type: "success" });
    } catch {
      toast({ message: "Could not save name — check connection", type: "error" });
    } finally {
      setEditingName(false);
    }
  }

  async function saveSchool() {
    if (!user) { setEditingSchool(false); return; }
    try {
      await updateUserProfile(user.uid, { school: schoolInput.trim() });
      setProfile((p) => ({ ...(p || {}), school: schoolInput.trim() }));
      toast({ message: "School saved", type: "success" });
    } catch {
      toast({ message: "Could not save school", type: "error" });
    } finally {
      setEditingSchool(false);
    }
  }

  async function confirmDelete() {
    if (deleteEmail.trim().toLowerCase() !== (user?.email || "").toLowerCase()) {
      toast({ message: "Email does not match", type: "warning" });
      return;
    }
    setDeleting(true);
    try {
      await softDeleteAccount(user.uid);
      toast({ message: "Account scheduled for deletion. You've been signed out.", type: "info" });
      await logout();
      navigate("/auth", { replace: true });
    } catch (e) {
      toast({ message: `Delete failed: ${e.message}`, type: "error" });
      setDeleting(false);
    }
  }

  const stats = [
    { icon: Star, label: "Total XP", value: (profile?.totalXP || 0).toLocaleString() },
    { icon: Flame, label: "Streak", value: `${profile?.streak || profile?.currentStreak || 0} days` },
    { icon: BookOpen, label: "Answered", value: answered.toLocaleString() },
    { icon: Target, label: "Accuracy", value: `${accuracy}%` },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-8 animate-fade">
      <header>
        <h1 className="text-3xl font-black text-text">Profile</h1>
        <p className="text-text-muted font-medium">Make ExamPadi yours.</p>
      </header>

      {/* Header card */}
      <div className="glass-card p-8">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <button onClick={() => setShowPicker(true)} title="Change avatar" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <AvatarDisplay user={user} profile={profile} size={96} radius={24} />
          </button>
          <div className="flex-1 text-center sm:text-left">
            {editingName ? (
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <input
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onBlur={saveName}
                  onKeyDown={(e) => e.key === "Enter" && saveName()}
                  className="input-field"
                  style={{ maxWidth: 240, fontWeight: 700 }}
                />
                <button onClick={saveName} style={{ background: "none", border: "none", color: "var(--success)", cursor: "pointer" }}><Check size={18} /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <h2 className="text-2xl font-black text-text">{profile?.name || user?.displayName || "Student"}</h2>
                <button onClick={() => setEditingName(true)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}><Pencil size={15} /></button>
              </div>
            )}
            <p className="text-text-muted text-sm">{user?.email}</p>
            <button
              onClick={async () => {
                try {
                  const next = !profile?.isPublic;
                  await updateUserProfile(user.uid, { isPublic: next });
                  setProfile((p) => ({ ...(p || {}), isPublic: next }));
                  toast({ message: next ? "Public profile ON — you appear on the feed & leaderboard 🌍" : "Public profile OFF — only you (and partners) see details", type: "success" });
                } catch {
                  toast({ message: "Could not update — check connection", type: "error" });
                }
              }}
              title="Show your profile, XP and badges on the community feed"
              style={{
                marginTop: 10, display: "inline-flex", alignItems: "center", gap: 8,
                padding: "8px 14px", borderRadius: 100, fontSize: 12, fontWeight: 700, cursor: "pointer",
                background: profile?.isPublic ? "rgb(var(--primary-rgb) / 0.14)" : "var(--bg-3)",
                color: profile?.isPublic ? "var(--primary)" : "var(--text-muted)",
                border: profile?.isPublic ? "1px solid var(--primary)" : "1px solid var(--border)",
                fontFamily: "inherit",
              }}
            >
              <span style={{
                width: 30, height: 17, borderRadius: 20, position: "relative",
                background: profile?.isPublic ? "var(--primary)" : "var(--border)",
                transition: "background 0.2s ease", flexShrink: 0,
              }}>
                <span style={{
                  position: "absolute", top: 2, width: 13, height: 13, borderRadius: "50%",
                  background: "#fff", left: profile?.isPublic ? 15 : 2, transition: "left 0.2s ease",
                }} />
              </span>
              🌍 Public profile {profile?.isPublic ? "ON" : "OFF"}
            </button>
            <div className="flex items-center gap-2 mt-3 justify-center sm:justify-start flex-wrap">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1 ${isPro ? "bg-accent/10 text-accent border border-accent/20" : "bg-subtle text-text-muted border border-border"}`}>
                {isPro && <Crown size={11} />} {isPro ? "Pro Member" : "Free Member"}
              </span>
              {(profile?.exam || profile?.targetScore) && (
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/20">
                  <GraduationCap size={11} style={{ display: "inline", verticalAlign: "-1px", marginRight: 4 }} />
                  {profile?.exam || "JAMB"}{profile?.targetScore ? ` · ${profile.targetScore}` : ""}
                </span>
              )}
            </div>
          </div>
          <Link to="/settings" className="btn-secondary px-5 py-2.5 text-sm">Settings</Link>
        </div>
      </div>

      {/* Academics */}
      <section className="glass-card p-6 space-y-4">
        <h3 className="font-black text-lg text-text">Academics</h3>
        <div className="flex flex-wrap gap-2">
          {(profile?.subjects || []).length > 0 ? (
            profile.subjects.map((s) => (
              <span key={s} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-semibold border border-primary/20">{s}</span>
            ))
          ) : (
            <span className="text-text-muted text-sm">No subjects yet.</span>
          )}
          <Link to="/settings" className="px-3 py-1.5 rounded-lg border border-dashed border-border text-text-muted text-sm font-semibold">+ Edit</Link>
        </div>
        {/* Unique sharable ID — friends add you with this */}
        {user?.uid && (
          <button
            onClick={() => {
              try {
                navigator.clipboard.writeText(user.uid);
                toast({ message: "Your ID copied — share it with friends to study together", type: "success" });
              } catch {
                toast({ message: user.uid, type: "info" });
              }
            }}
            title="Tap to copy — friends add you with this ID"
            style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: "inherit", width: "100%" }}
          >
            <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>My ID</span>
            <span className="wrap-anywhere" style={{ fontSize: 12, fontFamily: "monospace", color: "var(--primary)", fontWeight: 700 }}>{user.uid}</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)" }}>Tap to copy ⧉</span>
          </button>
        )}
        <div>
          {editingSchool ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={schoolInput}
                onChange={(e) => setSchoolInput(e.target.value)}
                onBlur={saveSchool}
                onKeyDown={(e) => e.key === "Enter" && saveSchool()}
                placeholder="School name (optional)"
                className="input-field"
                style={{ maxWidth: 280 }}
              />
              <button onClick={saveSchool} style={{ background: "none", border: "none", color: "var(--success)", cursor: "pointer" }}><Check size={18} /></button>
            </div>
          ) : (
            <button onClick={() => setEditingSchool(true)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: 14, fontFamily: "inherit", padding: 0 }}>
              <School size={15} /> {profile?.school || "Add your school (optional)"} <Pencil size={13} />
            </button>
          )}
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="glass-card p-5 text-center">
            <s.icon size={20} className="mx-auto mb-2 text-primary" />
            <div className="text-xl font-black text-text">{s.value}</div>
            <div className="text-xs text-text-muted font-medium">{s.label}</div>
          </div>
        ))}
      </section>

      {/* Achievements */}
      <section className="glass-card p-6">
        <h3 className="font-black text-lg text-text mb-4">Achievements ({unlocked.length}/{ACHIEVEMENTS.length})</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {ACHIEVEMENTS.map((a) => {
            const has = unlocked.includes(a.id);
            return (
              <div key={a.id} title={a.desc} className="rounded-xl border p-4 text-center transition-all"
                style={{
                  borderColor: has ? "var(--accent)" : "var(--border)",
                  background: has ? "rgb(var(--accent-rgb) / 0.08)" : "transparent",
                  opacity: has ? 1 : 0.45,
                }}>
                <div style={{ fontSize: 28 }}>{a.icon}</div>
                <div className="text-xs font-bold text-text mt-2">{a.name}</div>
                <div className="text-[11px] text-text-muted mt-1">{a.desc}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Danger zone */}
      <section className="glass-card p-6 border-danger/20">
        <h3 className="font-black text-lg text-danger mb-4 flex items-center gap-2"><AlertTriangle size={18} /> Danger Zone</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={async () => { await logout(); navigate("/auth", { replace: true }); }}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-border text-text-muted font-bold hover:text-danger transition-colors">
            <LogOut size={16} /> Sign Out
          </button>
          <button onClick={() => { setShowDelete(true); setDeleteEmail(""); }}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-danger/10 text-danger font-bold hover:bg-danger/20 transition-colors">
            <Trash2 size={16} /> Delete Account
          </button>
        </div>
      </section>

      {/* Avatar picker modal */}
      {showPicker && (
        <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowPicker(false); }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
          <div className="glass-card" style={{ position: "relative", width: "100%", maxWidth: 520, padding: 24, maxHeight: "90vh", overflowY: "auto" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-lg text-text">Choose avatar</h3>
              <button onClick={() => setShowPicker(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <AvatarPicker
              uid={user?.uid}
              profile={profile}
              onClose={() => setShowPicker(false)}
              onSaved={() => {
                if (user) getUserProfile(user.uid).then(setProfile).catch(() => {});
              }}
            />
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDelete && (
        <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={(e) => { if (e.target === e.currentTarget && !deleting) setShowDelete(false); }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }} />
          <div className="glass-card" style={{ position: "relative", width: "100%", maxWidth: 440, padding: 24 }}>
            <h3 className="font-black text-lg text-danger mb-2">Delete account?</h3>
            <p className="text-sm text-text-muted mb-4" style={{ lineHeight: 1.6 }}>
              Your profile will be anonymized now and all study data permanently removed within 30 days.
              Type your email to confirm:
            </p>
            <input
              value={deleteEmail}
              onChange={(e) => setDeleteEmail(e.target.value)}
              placeholder={user?.email || "email"}
              className="input-field"
              disabled={deleting}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={confirmDelete}
                disabled={deleting || deleteEmail.trim().toLowerCase() !== (user?.email || "").toLowerCase()}
                className="flex-1 px-4 py-3 rounded-xl bg-danger text-white font-bold disabled:opacity-40"
                style={{ border: "none", cursor: "pointer" }}
              >
                {deleting ? "Deleting…" : "Confirm delete"}
              </button>
              <button
                onClick={() => !deleting && setShowDelete(false)}
                className="px-4 py-3 rounded-xl border border-border text-text-muted font-bold"
                style={{ background: "none", cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
