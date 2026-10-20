import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { useSubscription } from "../hooks/useSubscription";
import { getUserProfile } from "../lib/userProfile";
import { chatWithTutor, analyzeDocument, getLastAIError } from "../lib/ai";
import { getStudentMemory, topWeakTopics } from "../lib/aiMemory";
import { appendToAISession, getAISessions, createAISession, deleteAISession, getAISession } from "../lib/aiSessions";
import { useFeatureOnlineGuard } from "../hooks/useOnlineStatus";
import { checkRateLimit } from "../lib/rateLimiter";
import { unlockAchievement } from "../lib/achievements";
import { preprocessImage } from "../lib/vision";
import { checkAILimit } from "../lib/usageTracker";
import { isImageRequest } from "../lib/imageGen";
import { logActivity } from "../lib/activityLog";
import ProUpgradeModal from "../components/ProUpgradeModal";
import MessageBubble from "../components/AITutor/MessageBubble";
import TypingIndicator from "../components/AITutor/TypingIndicator";
import ImageUpload from "../components/AITutor/ImageUpload";
import Logo from "../components/Logo";
import { Send, Plus, ChevronRight, Brain, FileSearch, Upload, Image as ImageIcon } from "lucide-react";
import FileUpload from "../components/FileUpload";
import ImageGenerator from "../components/ImageGenerator";

const QUICK_PROMPTS = [
  "Explain photosynthesis like I'm 10",
  "Solve this quadratic: x² - 5x + 6 = 0",
  "What's likely to come in JAMB Physics?",
  "Summarize Organic Chemistry for WAEC",
];

function genId() { return `chat_${Date.now()}`; }

export default function AITutor() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isPro } = useSubscription();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeSubject, setActiveSubject] = useState("General");
  const [conversationId, setConversationId] = useState(genId());
  const [showProModal, setShowProModal] = useState(false);
  const [aiUsage, setAiUsage] = useState(null);
  const [memory, setMemory] = useState(null);
  const [pendingImages, setPendingImages] = useState([]);
  const [analyzeMode, setAnalyzeMode] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showImageGen, setShowImageGen] = useState(false);
  const [genPrompt, setGenPrompt] = useState("");
  const [sessions, setSessions] = useState([]);
  const [showSessions, setShowSessions] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const { blocked, requireOnline, dismiss } = useFeatureOnlineGuard();
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const initialMessage = location.state?.initialMessage;

  useEffect(() => {
    if (user) getUserProfile(user.uid).then(setProfile).catch(() => {});
    if (user) getStudentMemory(user.uid).then(setMemory).catch(() => {});
    if (user && !isPro) {
      checkAILimit(user.uid).then(l => setAiUsage(l)).catch(() => {});
    }
    if (user) getAISessions(user.uid).then(setSessions).catch(() => {});
  }, [user, isPro]);

  const weakCount = topWeakTopics(memory, 5).length;

  const userSubjects = profile?.subjects || [];

  // Restore chat from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`ep-chat-${conversationId}`);
      if (saved) setMessages(JSON.parse(saved));
    } catch {}
  }, [conversationId]);

  // Auto-send initial message
  useEffect(() => {
    if (initialMessage && messages.length === 0) {
      handleSend(initialMessage);
    }
  }, [initialMessage]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Save to localStorage (strip image payloads — too large for storage)
  useEffect(() => {
    if (messages.length > 0) {
      try {
        const slim = messages.map((m) => {
          const copy = { ...m };
          delete copy.image;
          delete copy.images;
          return copy;
        });
        localStorage.setItem(`ep-chat-${conversationId}`, JSON.stringify(slim));
      } catch { /* storage full */ }
      if (currentSessionId) {
        appendToAISession(currentSessionId, messages.map((m) => ({ role: m.role, content: m.content }))).catch(() => {});
      }
    }
  }, [messages]);

  function handleNewChat() {
    const id = genId();
    setConversationId(id);
    setMessages([]);
    setCurrentSessionId(null);
    localStorage.removeItem(`ep-chat-${conversationId}`);
  }

  async function handleNewSession() {
    if (!user) return;
    try {
      const id = await createAISession(user.uid, activeSubject);
      setCurrentSessionId(id);
      setConversationId(genId());
      setMessages([]);
      setShowSessions(false);
      toast({ message: "New session started", type: "success" });
    } catch (e) {
      toast({ message: "Failed to create session", type: "error" });
    }
  }

  async function handleResumeSession(session) {
    try {
      const full = await getAISession(session.id);
      if (full?.messages) {
        setMessages(full.messages.map((m, i) => ({ id: `s_${i}`, role: m.role, content: m.content })));
        setCurrentSessionId(session.id);
        setActiveSubject(session.subject || "General");
        setShowSessions(false);
      }
    } catch (e) {
      toast({ message: "Failed to load session", type: "error" });
    }
  }

  async function handleDeleteSession(session) {
    if (!window.confirm("Delete this session?")) return;
    try {
      await deleteAISession(session.id);
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
      toast({ message: "Session deleted", type: "success" });
    } catch (e) {
      toast({ message: "Failed to delete", type: "error" });
    }
  }

  async function handleSelectImage(file) {
    if (!file) return;
    if (pendingImages.length >= 3) {
      toast({ message: "Maximum 3 photos — send these first, then add more", type: "info" });
      return;
    }
    try {
      const dataUrl = await preprocessImage(file);
      setPendingImages((prev) => [...prev, dataUrl].slice(0, 3));
      if (!input.trim()) setInput(analyzeMode ? "Analyze this document for my exam." : "Solve this question for me.");
    } catch (e) {
      toast({ message: e.message || "Could not read image", type: "warning" });
    }
  }

  async function handleSend(text) {
    const msg = text || input;
    const hasImages = pendingImages.length > 0;
    if ((!msg.trim() && !hasImages) || loading) return;
    if (!requireOnline("AI Tutor")) return;
    const rate = checkRateLimit(user?.uid || "anon", isPro ? 60 : 10);
    if (!rate.allowed) {
      toast({ message: `Rate limit exceeded. Try again in ${rate.retryAfter}s.`, type: "warning" });
      return;
    }

    try {
      // Free-tier daily AI limit
      if (!isPro && user) {
        const limit = await checkAILimit(user.uid);
        setAiUsage(limit);
        if (!limit.allowed) { setShowProModal(true); return; }
      }

      // Image request → ask for confirmation before anything is generated.
      if (!hasImages && isImageRequest(msg)) {
        const userMsg = { id: Date.now(), role: "user", content: msg.trim(), timestamp: new Date().toISOString() };
        const aiMsg = {
          id: Date.now() + 1,
          role: "ai",
          content: "I can generate that image for you. I'll open the generator with your request so you can review and approve the exact prompt before anything is drawn.",
          timestamp: new Date().toISOString(),
          pendingImage: { prompt: msg.trim() },
        };
        setMessages(prev => [...prev, userMsg, aiMsg]);
        setInput("");
        setPendingImages([]);
        logActivity({ action: "ai_image_request", userId: user?.uid, email: user?.email, details: { subject: activeSubject, prompt: msg.trim().slice(0, 120) } });
        return;
      }

      const images = pendingImages;
      const useAnalyze = analyzeMode && images.length > 0;
      const userMsg = { id: Date.now(), role: "user", content: (msg.trim() || (useAnalyze ? "Analyze this document for my exam." : "Solve this question for me.")), timestamp: new Date().toISOString() };
      if (images.length > 0) userMsg.images = images;
      setMessages(prev => [...prev, userMsg]);
      setInput("");
      setPendingImages([]);
      setLoading(true);

      if (user && !isPro) {
        // Usage is counted centrally by ai.js on a successful response.
        setAiUsage(prev => prev ? { ...prev, used: Math.min(prev.limit, prev.used + 1), available: Math.max(0, (prev.available ?? 0) - 1) } : prev);
      }

      const allMsgs = [...messages, userMsg];
      const response = useAnalyze
        ? await analyzeDocument({ images, subject: activeSubject, instruction: userMsg.content })
        : await chatWithTutor({
            messages: allMsgs.map((m) => ({ role: m.role, content: m.content })),
            subject: activeSubject,
            userProfile: { name: user?.displayName || "Student", exam: profile?.exam || "JAMB", targetScore: profile?.targetScore || 300 },
            memory,
            images,
          });

      const aiErr = getLastAIError();
      const content = aiErr && Date.now() - aiErr.time < 15000
        ? `⚠️ AI request failed: ${aiErr.message}`
        : response;

      const aiMsg = { id: Date.now() + 1, role: "ai", content, timestamp: new Date().toISOString() };
      setMessages(prev => [...prev, aiMsg]);
      setLoading(false);

      if (!(aiErr && Date.now() - aiErr.time < 15000) && user) {
        unlockAchievement(user.uid, "first_ai_chat").then((unlocked) => {
          if (unlocked) toast({ message: "🏆 Achievement unlocked: Curious Mind!", type: "success" });
        }).catch(() => {});
      }

      if (aiErr && Date.now() - aiErr.time < 15000) {
        toast({ message: `AI failed: ${aiErr.message}`, type: "error" });
      }

      logActivity({ action: "ai_chat", userId: user?.uid, email: user?.email, details: { subject: activeSubject, questionLength: userMsg.content.length, withImages: images.length, analyzeMode: useAnalyze } });
    } catch (e) {
      console.error("AI chat failed:", e);
      // Undo the optimistic counter — the message never went through.
      setAiUsage(prev => prev ? { ...prev, used: Math.max(0, prev.used - 1), available: (prev.available ?? 0) + 1 } : prev);
      if (e?.code === "AI_LIMIT") {
        setShowProModal(true);
        toast({ message: e.message, type: "warning" });
      } else {
        toast({ message: "Failed to get AI response. Please try again.", type: "error" });
      }
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) { textareaRef.current.style.height = "auto"; textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px"; }
  }, [input]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "'Inter', system-ui, sans-serif", color: "var(--text)", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{ background: "var(--bg-2)", borderBottom: "1px solid var(--border)", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Logo size={32} radius={9} />
          <span style={{ fontWeight: 700, fontSize: 16 }}>AI Tutor</span>
          {isPro && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", background: "rgb(var(--accent-rgb) / 0.15)", padding: "2px 8px", borderRadius: 6 }}>PRO</span>}
          {weakCount > 0 && (
            <span title={memory?.preferredStyle ? `Learning style: ${memory.preferredStyle}` : "I remember your weak topics"} style={{ fontSize: 11, fontWeight: 600, color: "var(--primary)", background: "var(--primary-dim)", border: "1px solid var(--border)", padding: "4px 10px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Brain size={12} /> Remembering {weakCount} weak topic{weakCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {!isPro && aiUsage && (() => {
            const totalLeft = aiUsage.available;
            if (totalLeft == null) return null;
            const out = totalLeft <= 0;
            const near = aiUsage.softWarning && !out;
            return (
              <span
                title={aiUsage.isFree
                  ? `${aiUsage.used}/${aiUsage.limit} AI messages today${aiUsage.packRemaining > 0 ? ` · ${aiUsage.packRemaining} pack credits` : ""}`
                  : `${aiUsage.monthUsed}/${aiUsage.monthLimit} AI messages this month${aiUsage.packRemaining > 0 ? ` · ${aiUsage.packRemaining} pack credits` : ""}`}
                style={{ fontSize: 11, fontWeight: 700, color: out ? "#ef4444" : near ? "var(--accent)" : "var(--text-muted)", background: "var(--bg-3)", border: "1px solid var(--border)", padding: "4px 10px", borderRadius: 6 }}
              >
                AI {totalLeft} left
              </span>
            );
          })()}
          {!isPro && (
            <button onClick={() => setShowProModal(true)} style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: "linear-gradient(135deg, var(--primary), var(--accent))", color: "#fff", fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
              Go Pro
            </button>
          )}
          <button onClick={handleNewChat} style={{ padding: "8px 14px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
            <Plus size={14} /> New Chat
          </button>
          <button onClick={() => setShowSessions(!showSessions)} style={{ padding: "8px 14px", borderRadius: 8, background: showSessions ? "var(--primary)" : "var(--bg-3)", border: "1px solid var(--border)", color: showSessions ? "#fff" : "var(--text-muted)", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
            History ({sessions.length})
          </button>
        </div>
      </div>

      {showSessions && (
        <div style={{ position: "absolute", top: 60, left: 16, zIndex: 50, width: 280, maxHeight: 400, overflowY: "auto", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
          <div style={{ padding: 12, borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>Session History</span>
            <button onClick={handleNewSession} style={{ background: "var(--primary)", border: "none", borderRadius: 6, padding: "4px 10px", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>New</button>
          </div>
          {sessions.length === 0 ? (
            <div style={{ padding: 16, color: "var(--text-muted)", fontSize: 12, textAlign: "center" }}>No past sessions</div>
          ) : (
            sessions.map((s) => (
              <div key={s.id} style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => handleResumeSession(s)} style={{ flex: 1, background: "none", border: "none", color: "var(--text)", fontSize: 12, textAlign: "left", cursor: "pointer" }}>
                  <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title || s.subject}</div>
                  <div style={{ color: "var(--text-muted)", fontSize: 10 }}>{s.subject} · {new Date(s.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString()}</div>
                </button>
                <button onClick={() => handleDeleteSession(s)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}>✕</button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Subject context pills */}
      <div style={{ display: "flex", gap: 6, padding: "8px 20px", background: "var(--bg)", borderBottom: "1px solid var(--border)", overflowX: "auto", flexShrink: 0 }}>
        {["General", ...userSubjects].map(s => (
          <button key={s} onClick={() => setActiveSubject(s)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: activeSubject === s ? "var(--primary)" : "var(--bg-3)", color: activeSubject === s ? "#fff" : "var(--text-muted)", fontWeight: 600, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>
            {s}
          </button>
        ))}
      </div>

      {/* Chat area — free users get PLANS.free.limits.aiTutorMessages per day */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
            {messages.length === 0 && !loading && (
              <div style={{ textAlign: "center", paddingTop: 60 }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>✨</div>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>Hi {user?.displayName?.split(" ")[0] || "Student"}! I'm your ExamPadi Tutor</h2>
                <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 auto 24px", maxWidth: 400 }}>Ask me anything about your subjects — or snap a photo of a question with 📷. I can explain topics, solve questions, make study plans, and more.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 400, margin: "0 auto" }}>
                  {QUICK_PROMPTS.map(p => (
                    <button key={p} onClick={() => handleSend(p)} style={{ padding: "10px 16px", borderRadius: 10, background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer", fontSize: 13, textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "inherit" }}>
                      {p} <ChevronRight size={14} color="var(--text-muted)" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(m => (
              <MessageBubble
                key={m.id}
                message={m}
                onGenerateImage={(prompt) => { setGenPrompt(prompt); setShowImageGen(true); }}
              />
            ))}

            {loading && <TypingIndicator />}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ background: "var(--bg-2)", borderTop: "1px solid var(--border)", padding: 16, flexShrink: 0 }}>
            <div style={{ position: "relative", maxWidth: 800, margin: "0 auto", display: "flex", gap: 8, alignItems: "flex-end" }}>
              <ImageUpload previews={pendingImages} onSelect={handleSelectImage} onClear={() => setPendingImages([])} onClearOne={(i) => setPendingImages((prev) => prev.filter((_, j) => j !== i))} disabled={loading} />
              <button
                onClick={() => {
                  const next = !analyzeMode;
                  setAnalyzeMode(next);
                  if (next && !input.trim()) setInput("Analyze this document for my exam.");
                  toast({ message: next ? "📄 Document analyze mode ON — attach up to 3 photos" : "Document analyze mode OFF", type: "info" });
                }}
                title="Toggle document analysis mode"
                style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  background: analyzeMode ? "var(--accent)" : "var(--bg-3)",
                  border: "1px solid var(--border)",
                  color: analyzeMode ? "#fff" : "var(--text-muted)",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <FileSearch size={16} />
              </button>
              <button
                onClick={() => setShowUpload(true)}
                title="Upload document or video"
                style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  background: "var(--bg-3)",
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <Upload size={16} />
              </button>
              <button
                onClick={() => setShowImageGen(true)}
                title="Generate educational image"
                style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  background: "var(--bg-3)",
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <ImageIcon size={16} />
              </button>
              <div style={{ position: "relative", flex: 1 }}>
              <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={pendingImages.length > 0 ? (analyzeMode ? "What should I pull out of these pages?…" : "Describe what to solve…") : `Ask anything about ${activeSubject}…`} rows={1} style={{ width: "100%", padding: "12px 48px 12px 16px", borderRadius: 12, background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 14, outline: "none", resize: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
              <button onClick={() => handleSend()} disabled={(!input.trim() && pendingImages.length === 0) || loading} style={{ position: "absolute", right: 6, bottom: 6, width: 36, height: 36, borderRadius: "50%", background: (input.trim() || pendingImages.length > 0) && !loading ? "var(--primary)" : "var(--border)", border: "none", color: (input.trim() || pendingImages.length > 0) && !loading ? "#fff" : "var(--text-muted)", cursor: (input.trim() || pendingImages.length > 0) && !loading ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Send size={16} />
              </button>
              </div>
            </div>
          </div>
        </div>

      <ProUpgradeModal open={showProModal} onClose={() => setShowProModal(false)} reason="ai" dismissible />

      {showUpload && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={() => setShowUpload(false)} />
          <div className="glass-card" style={{ position: "relative", width: "100%", maxWidth: 480, padding: 24 }}>
            <h3 style={{ color: "var(--text)", fontSize: 18, fontWeight: 800, margin: "0 0 16px" }}>Upload Document or Video</h3>
            <FileUpload
              onUploadComplete={(file) => { setShowUpload(false); toast({ message: `Uploaded: ${file.name}`, type: "success" }); }}
              onUploadError={(msg) => toast({ message: msg, type: "error" })}
            />
          </div>
        </div>
      )}

      {showImageGen && <ImageGenerator initialPrompt={genPrompt} onClose={() => { setShowImageGen(false); setGenPrompt(""); }} />}

      {blocked && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)" }} onClick={dismiss} />
          <div className="glass-card" style={{ position: "relative", padding: 32, textAlign: "center", maxWidth: 400 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ color: "var(--text)", fontSize: 18, fontWeight: 800, marginBottom: 8 }}>You need to be online</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 20 }}>{blocked} requires an internet connection. Please check your network and try again.</p>
            <button onClick={dismiss} className="btn-primary" style={{ padding: "10px 24px" }}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}