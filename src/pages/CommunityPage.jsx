// Community page — school community group chat + student-created groups.
// Grok-style UI: dark chat bubbles, AI assist toggle, role badges.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { getUserProfile } from "../lib/userProfile";
import { askGroq } from "../lib/ai";
import {
  subscribeCommunity, subscribeCommunityMembers, subscribeCommunityChat,
  sendCommunityMessage,
  subscribeUserGroups, createUserGroup, joinUserGroup, leaveUserGroup,
  subscribeUserGroupChat,
} from "../lib/schoolCommunity";
import { ArrowLeft, Send, Users, Sparkles, Plus, MessageCircle, Bot, User, Hash, Loader2 } from "lucide-react";

export default function CommunityPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [community, setCommunity] = useState(null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [aiAssist, setAiAssist] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [userGroups, setUserGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null); // user-created group
  const [groupMessages, setGroupMessages] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: "", description: "", topic: "Study" });
  const bottomRef = useRef(null);

  useEffect(() => {
    if (user) getUserProfile(user.uid).then(setProfile).catch(() => {});
  }, [user]);

  const groupId = profile?.schoolId || profile?.orgId || null;

  useEffect(() => {
    if (!groupId) return;
    const u1 = subscribeCommunity(groupId, setCommunity);
    const u2 = subscribeCommunityMembers(groupId, setMembers);
    const u3 = subscribeCommunityChat(groupId, setMessages);
    const u4 = subscribeUserGroups(setUserGroups);
    return () => { u1(); u2(); u3(); u4(); };
  }, [groupId]);

  useEffect(() => {
    if (!activeGroup) return;
    const u = subscribeUserGroupChat(activeGroup, setGroupMessages);
    return () => u();
  }, [activeGroup]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, groupMessages]);

  async function send() {
    const clean = text.trim();
    if (!clean || sending || !groupId) return;
    setSending(true);
    try {
      await sendCommunityMessage(groupId, {
        fromUid: user.uid,
        fromName: profile?.name || user.displayName || "Member",
        text: clean,
        role: profile?.role,
      });
      setText("");
      // AI assist: auto-reply when enabled and message asks a question
      if (aiAssist && clean.includes("?")) {
        setAiBusy(true);
        const answer = await askGroq(
          "You are the ExamPadi community study assistant. Answer briefly and helpfully for Nigerian students. Use simple language. Max 80 words.",
          `Student asks in the school community: "${clean}"`,
          { maxTokens: 200, source: "community" }
        ).catch(() => null);
        if (answer) {
          await sendCommunityMessage(groupId, {
            fromUid: "ai-assistant",
            fromName: "AI Study Assistant",
            text: String(answer).slice(0, 600),
            role: "assistant",
          });
        }
        setAiBusy(false);
      }
    } catch (e) {
      toast({ message: e.message || "Could not send", type: "error" });
    } finally {
      setSending(false);
    }
  }

  async function handleCreateGroup() {
    if (!newGroup.name.trim()) {
      toast({ message: "Enter a group name", type: "warning" });
      return;
    }
    try {
      const id = await createUserGroup({
        name: newGroup.name.trim(),
        description: newGroup.description.trim(),
        topic: newGroup.topic,
        createdBy: user.uid,
        createdByName: profile?.name || "Student",
        schoolId: groupId,
      });
      setNewGroup({ name: "", description: "", topic: "Study" });
      setShowCreate(false);
      toast({ message: "Group created ✓", type: "success" });
      setActiveGroup(id);
    } catch (e) {
      toast({ message: e.message, type: "error" });
    }
  }

  async function handleJoinGroup(g) {
    if (!user) return;
    try {
      if (!g.members?.includes(user.uid)) await joinUserGroup(g.id, user.uid);
      setActiveGroup(g.id);
    } catch (e) {
      toast({ message: e.message || "Could not join group", type: "error" });
    }
  }

  async function handleLeaveGroup(g) {
    try {
      await leaveUserGroup(g.id, user.uid);
      if (activeGroup === g.id) setActiveGroup(null);
    } catch (e) {
      toast({ message: e.message || "Could not leave group", type: "error" });
    }
  }

  return (
    <div className="page-content max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Link to="/dashboard" className="p-2 rounded-lg hover:bg-subtle" aria-label="Back"><ArrowLeft size={18} /></Link>
          <div>
            <h1 className="text-xl font-black flex items-center gap-2"><Hash size={18} className="text-primary" /> {groupId ? (community?.schoolName || "School Community") : "Groups & Community"}</h1>
            <p className="text-xs text-text-muted">
              {groupId ? `${members.length} member${members.length === 1 ? "" : "s"} · students & teachers` : `${userGroups.length} group${userGroups.length === 1 ? "" : "s"} · join any group`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to="/dashboard" className="btn-secondary text-xs px-3 py-2">Dashboard</Link>
          <button onClick={() => setShowCreate((s) => !s)} className="btn-primary text-xs px-3 py-2">
            <Plus size={14} /> New Group
          </button>
        </div>
      </div>

      {/* Welcome banner */}
      {community?.welcome && (
        <div className="glass-card p-4 text-sm" style={{ borderColor: "rgb(var(--primary-rgb) / 0.4)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
          {community.welcome}
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_300px] gap-4">
        {groupId ? (
        <div className="glass-card p-4 flex flex-col" style={{ minHeight: 420 }}>
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <h2 className="font-black text-sm flex items-center gap-1.5"><MessageCircle size={15} className="text-primary" /> Community chat</h2>
            <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer" style={{ color: aiAssist ? "var(--primary)" : "var(--text-muted)" }}>
              <input type="checkbox" checked={aiAssist} onChange={(e) => setAiAssist(e.target.checked)} />
              <Sparkles size={12} /> AI assist
            </label>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 mb-3" style={{ maxHeight: 380 }}>
            {messages.length === 0 && (
              <p className="text-sm text-text-muted text-center py-8">No messages yet. Say hi to your school 👋</p>
            )}
            {messages.map((m) => {
              const mine = m.fromUid === user?.uid;
              const isAI = m.fromUid === "ai-assistant" || m.role === "assistant";
              return (
                <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "80%", padding: "9px 13px", borderRadius: 14,
                    background: isAI ? "rgb(var(--accent-rgb) / 0.12)" : mine ? "var(--primary)" : "var(--bg-3)",
                    color: mine && !isAI ? "#fff" : "var(--text)",
                    border: isAI ? "1px solid rgb(var(--accent-rgb) / 0.35)" : "none",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                      {isAI ? <Bot size={11} /> : <User size={11} />}
                      <span style={{ fontSize: 10, fontWeight: 800, color: isAI ? "var(--accent)" : mine ? "rgba(255,255,255,0.8)" : "var(--primary)" }}>{m.fromName}</span>
                      {m.role === "teacher" && <span style={{ fontSize: 8, fontWeight: 800, padding: "1px 5px", borderRadius: 4, background: "rgba(255,255,255,0.2)" }}>TEACHER</span>}
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{m.text}</div>
                  </div>
                </div>
              );
            })}
            {aiBusy && <div className="flex items-center gap-2 text-xs text-text-muted"><Loader2 size={13} className="animate-spin" /> AI is typing…</div>}
            <div ref={bottomRef} />
          </div>
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Message your school…"
              className="input-field flex-1"
            />
            <button onClick={send} disabled={sending || !text.trim()} className="btn-primary px-4"><Send size={16} /></button>
          </div>
        </div>
        ) : (
          <div className="glass-card p-6 text-center flex flex-col items-center justify-center" style={{ minHeight: 420 }}>
            <Users size={40} className="mb-3" style={{ color: "var(--text-muted)" }} />
            <h2 className="text-lg font-black mb-1">Join your school community</h2>
            <p className="text-sm text-text-muted mb-3 max-w-xs">Add your school code in Settings to unlock your private school group chat with classmates and teachers. You can still join student groups on the right.</p>
            <Link to="/settings" className="btn-primary text-sm px-4 py-2">Add school code</Link>
          </div>
        )}

        {/* Sidebar: members + groups */}
        <div className="space-y-4">
          {groupId && (
          <div className="glass-card p-4">
            <h3 className="font-black text-xs uppercase tracking-widest text-text-muted mb-2 flex items-center gap-1"><Users size={12} /> Members</h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-2 text-sm">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black" style={{ background: m.role === "teacher" ? "rgb(var(--accent-rgb) / 0.25)" : "rgb(var(--primary-rgb) / 0.2)", color: m.role === "teacher" ? "var(--accent)" : "var(--primary)" }}>
                    {(m.name || "?")[0].toUpperCase()}
                  </div>
                  <span className="flex-1 truncate">{m.name}</span>
                  {m.role === "teacher" && <span style={{ fontSize: 8, fontWeight: 800, color: "var(--accent)" }}>T</span>}
                </div>
              ))}
            </div>
          </div>
          )}

          <div className="glass-card p-4">
            <h3 className="font-black text-xs uppercase tracking-widest text-text-muted mb-2 flex items-center gap-1"><Hash size={12} /> Student Groups</h3>
            {userGroups.length === 0 && <p className="text-xs text-text-muted">No groups yet. Create one!</p>}
            <div className="space-y-1.5">
              {userGroups.map((g) => {
                const joined = user?.uid && g.members?.includes(user.uid);
                return (
                  <div key={g.id} className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleJoinGroup(g)}
                      className="flex-1 text-left px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors truncate"
                      style={{ background: activeGroup === g.id ? "rgb(var(--primary-rgb) / 0.15)" : "transparent", color: activeGroup === g.id ? "var(--primary)" : "var(--text)" }}
                    >
                      #{g.name}
                      <span className="ml-1 opacity-60" style={{ fontSize: 9 }}>{g.memberCount || g.members?.length || 0}</span>
                    </button>
                    {joined ? (
                      <button onClick={() => handleLeaveGroup(g)} title="Leave group" className="text-[10px] px-1.5 py-1 rounded" style={{ color: "var(--danger)", background: "rgba(255,77,106,0.1)" }}>Leave</button>
                    ) : (
                      <button onClick={() => handleJoinGroup(g)} className="text-[10px] px-2 py-1 rounded font-bold" style={{ color: "var(--primary)", background: "rgb(var(--primary-rgb) / 0.12)" }}>Join</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Create group modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="glass-card relative p-5 w-full max-w-sm space-y-3">
            <h3 className="font-black">Create a group</h3>
            <input value={newGroup.name} onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })} placeholder="Group name (e.g. Physics WASSCE)" className="input-field" />
            <textarea value={newGroup.description} onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })} placeholder="What's this group about?" rows={2} className="input-field" />
            <select value={newGroup.topic} onChange={(e) => setNewGroup({ ...newGroup, topic: e.target.value })} className="input-field">
              {["Study", "Gist", "Games", "Q&A", "Past Questions"].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={handleCreateGroup} className="btn-primary flex-1">Create</button>
              <button onClick={() => setShowCreate(false)} className="btn-secondary px-4">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}