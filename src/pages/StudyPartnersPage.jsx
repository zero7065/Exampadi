import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSubscription } from "../hooks/useSubscription";
import { useToast } from "../components/Toast";
import ProGate from "../components/ProGate";
import PresenceBadge from "../components/PresenceBadge";
import { subscribePresenceForUids } from "../lib/presence";
import {
  getPartners, addPartner, removePartner,
  createSharedTest, getPartnerTests, getPartnerLeaderboard,
} from "../lib/studyPartners";
import { shareOnWhatsApp } from "../components/WhatsAppShare";
import {
  Users, UserPlus, Trash2, Target,
  MessageCircle, Play, X,
} from "lucide-react";

export default function StudyPartnersPage() {
  const { user } = useAuth();
  const { isPro } = useSubscription();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [partners, setPartners] = useState([]);
  const [tests, setTests] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [presence, setPresence] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);

  const [scheduleForm, setScheduleForm] = useState({
    subject: "Use of English Language",
    questionCount: 10,
    timeLimit: 600,
  });

  const SUBJECTS = [
    "Use of English Language", "Mathematics", "Physics", "Chemistry",
    "Biology", "Economics", "Government", "Literature", "CRS",
    "Geography", "Commerce", "Accounting", "Further Maths",
  ];

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  useEffect(
    () => subscribePresenceForUids(partners.map((p) => p.uid), setPresence),
    [partners],
  );

  async function loadData() {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        getPartners(user.uid),
        getPartnerTests(user.uid),
        getPartnerLeaderboard(user.uid),
      ]);
      setPartners(results[0].status === "fulfilled" ? results[0].value : []);
      setTests(results[1].status === "fulfilled" ? results[1].value : []);
      setLeaderboard(results[2].status === "fulfilled" ? results[2].value : []);

      const failures = results.filter(r => r.status === "rejected");
      if (failures.length > 0) {
        console.warn("Some partner data failed to load:", failures.map(f => f.reason?.message));
      }
    } catch (e) {
      console.error(e);
      toast({ message: "Failed to load study partners data.", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function handleAddPartner(partnerUid) {
    if (!partnerUid || partnerUid.trim() === "") {
      toast({ message: "Enter a valid user ID", type: "error" });
      return;
    }
    if (partnerUid === user.uid) {
      toast({ message: "You can't add yourself", type: "error" });
      return;
    }
    try {
      await addPartner(user.uid, partnerUid.trim());
      toast({ message: "Partner added!", type: "success" });
      setShowAddModal(false);
      loadData();
    } catch (e) {
      toast({ message: e.message, type: "error" });
    }
  }

  async function handleRemovePartner(partnerUid) {
    try {
      await removePartner(user.uid, partnerUid);
      toast({ message: "Partner removed", type: "success" });
      loadData();
    } catch (e) {
      toast({ message: e.message, type: "error" });
    }
  }

  function handleInviteWhatsApp() {
    const base = window.location.origin;
    const message = `Hey! Join me on ExamPadi as my study partner. We can schedule tests and compare scores!\n\nDownload here: ${base}/auth\n\nMy User ID: ${user.uid}`;
    shareOnWhatsApp({ title: "", text: message, url: "" });
  }

  async function handleScheduleTest() {
    if (!selectedPartner) {
      toast({ message: "Select a partner first", type: "error" });
      return;
    }
    try {
      await createSharedTest(user.uid, user.displayName || "Student", {
        partnerUid: selectedPartner.uid,
        subject: scheduleForm.subject,
        questionCount: scheduleForm.questionCount,
        timeLimit: scheduleForm.timeLimit,
      });
      toast({ message: "Test scheduled! Partner can now take it.", type: "success" });
      setShowScheduleModal(false);
      setSelectedPartner(null);
      loadData();
    } catch (e) {
      toast({ message: e.message, type: "error" });
    }
  }

  function handleStartTest(test) {
    navigate("/shared-test", { state: { test } });
  }

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", paddingTop: 80 }}>
        Loading study partners...
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 16px", maxWidth: 600, margin: "0 auto", paddingTop: 80 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Users size={28} color="var(--primary)" />
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Study Partners</h1>
      </div>

      {!isPro && (
        <ProGate reason="Study Partners is a Pro feature. Upgrade to study with friends!">
          <div style={{ height: 200 }} />
        </ProGate>
      )}

      {isPro && (
        <>
          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            <button
              onClick={() => navigate("/room")}
              style={{
                flex: 1, minWidth: 140, padding: "14px 16px", borderRadius: 14,
                background: "linear-gradient(135deg, var(--success), var(--primary))",
                color: "#fff", fontWeight: 700, fontSize: 14,
                border: "none", cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <Play size={18} /> Study Room
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                flex: 1, minWidth: 140, padding: "14px 16px", borderRadius: 14,
                background: "linear-gradient(135deg, var(--primary), var(--accent))",
                color: "#fff", fontWeight: 700, fontSize: 14,
                border: "none", cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <UserPlus size={18} /> Add Partner
            </button>
            <button
              onClick={handleInviteWhatsApp}
              style={{
                flex: 1, minWidth: 140, padding: "14px 16px", borderRadius: 14,
                background: "linear-gradient(135deg, #25D366, #128C7E)",
                color: "#fff", fontWeight: 700, fontSize: 14,
                border: "none", cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <MessageCircle size={18} /> Invite via WhatsApp
            </button>
          </div>

          {/* Partners List */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: "var(--text)" }}>
              Your Partners ({partners.length})
            </h2>
            {partners.length === 0 ? (
              <div style={{
                padding: 32, textAlign: "center", borderRadius: 16,
                background: "rgb(var(--primary-rgb) / 0.08)", border: "1px solid rgb(var(--primary-rgb) / 0.2)",
              }}>
                <Users size={40} color="var(--primary)" style={{ opacity: 0.5, marginBottom: 12 }} />
                <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
                  No partners yet. Add a friend by their User ID or invite them via WhatsApp!
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {partners.map((p) => (
                  <div key={p.uid} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "14px 16px", borderRadius: 14,
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: "50%",
                      background: "linear-gradient(135deg, var(--primary), var(--accent))",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontWeight: 700, fontSize: 16,
                    }}>
                      {(p.displayName || "?")[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
                        {p.displayName || "Student"}
                        <PresenceBadge presence={presence[p.uid]} />
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        ⚡ {p.totalXP || p.xp || 0} XP · 🔥 {p.streak || 0} day streak
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/friends/chat/${p.pairId}`)}
                      style={{
                        padding: "8px 14px", borderRadius: 10,
                        background: "rgb(var(--primary-rgb) / 0.15)", color: "var(--primary)",
                        fontWeight: 600, fontSize: 12, border: "none", cursor: "pointer",
                        display: "inline-flex", alignItems: "center", gap: 6,
                      }}
                    >
                      <MessageCircle size={14} /> Chat
                    </button>
                    <button
                      onClick={() => { setSelectedPartner(p); setShowScheduleModal(true); }}
                      style={{
                        padding: "8px 14px", borderRadius: 10,
                        background: "rgb(var(--primary-rgb) / 0.15)", color: "var(--primary)",
                        fontWeight: 600, fontSize: 12, border: "none", cursor: "pointer",
                      }}
                    >
                      Schedule Test
                    </button>
                    <button
                      onClick={() => handleRemovePartner(p.uid)}
                      style={{
                        padding: 8, borderRadius: 8,
                        background: "rgba(255,59,48,0.1)", color: "#ff3b30",
                        border: "none", cursor: "pointer",
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Shared Tests */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: "var(--text)" }}>
              Shared Tests ({tests.length})
            </h2>
            {tests.length === 0 ? (
              <div style={{
                padding: 32, textAlign: "center", borderRadius: 16,
                background: "rgba(37,211,102,0.08)", border: "1px solid rgba(37,211,102,0.2)",
              }}>
                <Target size={40} color="#25D366" style={{ opacity: 0.5, marginBottom: 12 }} />
                <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
                  No shared tests yet. Schedule a test with a partner!
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {tests.map((t) => {
                  const isCreator = t.creatorUid === user.uid;
                  const myResult = t[`results_${user.uid}`];
                  const partnerResult = t[`results_${t.partnerUid || t.creatorUid}`];
                  const canStart = t.status === "pending" && !isCreator && !myResult;

                  return (
                    <div key={t.id} style={{
                      padding: "16px", borderRadius: 14,
                      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{t.subject}</div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            {isCreator ? "Created by you" : `Created by ${t.creatorName}`}
                          </div>
                        </div>
                        <span style={{
                          padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                          background: t.status === "completed" ? "rgba(52,199,89,0.15)" :
                            t.status === "active" ? "rgba(255,204,0,0.15)" : "rgb(var(--primary-rgb) / 0.15)",
                          color: t.status === "completed" ? "#34c759" :
                            t.status === "active" ? "#ffcc00" : "var(--primary)",
                        }}>
                          {t.status === "completed" ? "Done" : t.status === "active" ? "In Progress" : "Pending"}
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
                        <span>📝 {t.questionCount} Qs</span>
                        <span>⏱ {Math.floor(t.timeLimit / 60)}m</span>
                      </div>

                      {(myResult || partnerResult) && (
                        <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
                          {myResult && (
                            <div style={{
                              padding: "8px 12px", borderRadius: 10,
                              background: "rgb(var(--primary-rgb) / 0.1)", fontSize: 13,
                            }}>
                              You: <strong>{myResult.score}%</strong> ({myResult.correct}/{myResult.total})
                            </div>
                          )}
                          {partnerResult && (
                            <div style={{
                              padding: "8px 12px", borderRadius: 10,
                              background: "rgba(37,211,102,0.1)", fontSize: 13,
                            }}>
                              Partner: <strong>{partnerResult.score}%</strong> ({partnerResult.correct}/{partnerResult.total})
                            </div>
                          )}
                        </div>
                      )}

                      {canStart && (
                        <button
                          onClick={() => handleStartTest(t)}
                          style={{
                            padding: "10px 20px", borderRadius: 10,
                            background: "linear-gradient(135deg, var(--primary), var(--accent))",
                            color: "#fff", fontWeight: 700, fontSize: 13,
                            border: "none", cursor: "pointer", display: "flex",
                            alignItems: "center", gap: 6,
                          }}
                        >
                          <Play size={16} /> Start Test
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Partner Leaderboard */}
          {leaderboard.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: "var(--text)" }}>
                Partner Leaderboard
              </h2>
              <div style={{
                borderRadius: 16, overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.08)",
              }}>
                {leaderboard.map((entry, i) => (
                  <div key={entry.uid} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "14px 16px",
                    background: entry.isMe
                      ? "rgb(var(--primary-rgb) / 0.12)"
                      : i % 2 === 0 ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
                    borderBottom: i < leaderboard.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "rgba(255,255,255,0.1)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 800, color: i < 3 ? "#000" : "var(--text-muted)",
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: entry.isMe ? "var(--primary)" : "#fff" }}>
                        {entry.name} {entry.isMe && "(You)"}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>⭐ {entry.xp} XP</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>🔥 {entry.streak} day streak</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Partner Modal */}
      {showAddModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.7)", display: "flex",
          alignItems: "center", justifyContent: "center", padding: 16,
        }} onClick={() => setShowAddModal(false)}>
          <div style={{
            background: "var(--bg-2)", borderRadius: 20, padding: 28,
            width: "100%", maxWidth: 400, border: "1px solid rgba(255,255,255,0.1)",
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800 }}>Add Study Partner</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
              Enter your friend's User ID to add them. Share your ID with friends so they can add you.
            </p>

            <div style={{ background: "rgb(var(--primary-rgb) / 0.1)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, cursor: "pointer" }}
              onClick={() => { navigator.clipboard.writeText(user.uid).then(() => toast({ message: "Your User ID copied!", type: "success" })); }}>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>Your User ID (tap to copy):</div>
              <div style={{ fontSize: 12, fontFamily: "monospace", color: "var(--primary)", fontWeight: 700, wordBreak: "break-all" }}>{user.uid}</div>
            </div>

            <AddPartnerForm onSubmit={handleAddPartner} />
          </div>
        </div>
      )}

      {/* Schedule Test Modal */}
      {showScheduleModal && selectedPartner && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.7)", display: "flex",
          alignItems: "center", justifyContent: "center", padding: 16,
        }} onClick={() => setShowScheduleModal(false)}>
          <div style={{
            background: "var(--bg-2)", borderRadius: 20, padding: 28,
            width: "100%", maxWidth: 400, border: "1px solid rgba(255,255,255,0.1)",
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800 }}>Schedule Test</h3>
              <button onClick={() => setShowScheduleModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
              Challenge <strong>{selectedPartner.displayName || "Partner"}</strong> to a test!
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>Subject</label>
              <select
                value={scheduleForm.subject}
                onChange={(e) => setScheduleForm({ ...scheduleForm, subject: e.target.value })}
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 12,
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff", fontSize: 14,
                }}
              >
                {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>Questions</label>
                <select
                  value={scheduleForm.questionCount}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, questionCount: parseInt(e.target.value) })}
                  style={{
                    width: "100%", padding: "12px 14px", borderRadius: 12,
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff", fontSize: 14,
                  }}
                >
                  <option value={5}>5 Questions</option>
                  <option value={10}>10 Questions</option>
                  <option value={20}>20 Questions</option>
                  <option value={40}>40 Questions (Full)</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>Time Limit</label>
                <select
                  value={scheduleForm.timeLimit}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, timeLimit: parseInt(e.target.value) })}
                  style={{
                    width: "100%", padding: "12px 14px", borderRadius: 12,
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff", fontSize: 14,
                  }}
                >
                  <option value={300}>5 minutes</option>
                  <option value={600}>10 minutes</option>
                  <option value={1200}>20 minutes</option>
                  <option value={2400}>40 minutes</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleScheduleTest}
              style={{
                width: "100%", padding: "14px", borderRadius: 14,
                background: "linear-gradient(135deg, var(--primary), var(--accent))",
                color: "#fff", fontWeight: 700, fontSize: 15,
                border: "none", cursor: "pointer",
              }}
            >
              Schedule Test
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddPartnerForm({ onSubmit }) {
  const [uid, setUid] = useState("");

  return (
    <div>
      <input
        value={uid}
        onChange={(e) => setUid(e.target.value)}
        placeholder="Enter partner's User ID"
        style={{
          width: "100%", padding: "14px 16px", borderRadius: 12,
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
          color: "#fff", fontSize: 14, marginBottom: 12, boxSizing: "border-box",
        }}
      />
      <button
        onClick={() => onSubmit(uid)}
        style={{
          width: "100%", padding: "14px", borderRadius: 14,
          background: "linear-gradient(135deg, var(--primary), var(--accent))",
          color: "#fff", fontWeight: 700, fontSize: 15,
          border: "none", cursor: "pointer",
        }}
      >
        Add Partner
      </button>
    </div>
  );
}
