import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, orderBy, limit, getDocs, doc, updateDoc, serverTimestamp, where } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useAuth } from "../context/AuthContext";
import { isAdmin as _isAdmin, logActivity } from "../lib/activityLog";
import AdminMedia from "../components/AdminMedia";
import AdminCompliance from "../components/AdminCompliance";
import AdminTeams from "../components/AdminTeams";
import AdminContent from "../components/AdminContent";
const isAdmin = typeof _isAdmin === 'function' ? _isAdmin : () => false;
import { Shield, Users, Activity, BookOpen, Crown, ArrowLeft, RefreshCw, UserCheck, UserX, ChevronDown, Search, CrownIcon, Zap, CreditCard, ClipboardList, Award, Clock, FileText, CheckCircle, XCircle, Wifi, Eye } from "lucide-react";
import NetworkDiagnostic from "../components/NetworkDiagnostic";
import AdminTrainingData from "../components/AdminTrainingData";
import AdminTeachers from "../components/AdminTeachers";
import AdminDevSettings from "../components/AdminDevSettings";
import AdminBranding from "../components/AdminBranding";
import AdminUserView from "../components/AdminUserView";
import AdminAnalytics from "../components/AdminAnalytics";
import AdminAIUsage from "../components/AdminAIUsage";

const FULL_PRO_FEATURES = {
  notepad: true,
  studyPlan: true,
  analysis: true,
  allSubjects: true,
  aiTutor: true,
  mockExams: true,
  whiteboard: true,
  hints: true,
  assignments: true,
};

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [stats, setStats] = useState({ users: 0, sessions: 0, mockExams: 0, proUsers: 0, totalQuestions: 0, totalXP: 0, totalPayments: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [assignModal, setAssignModal] = useState(null);
  const [assignPlan, setAssignPlan] = useState("pro_monthly");
  const [assignDays, setAssignDays] = useState(30);
  const [assigning, setAssigning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [viewingAs, setViewingAs] = useState(null);
  const [userActivity, setUserActivity] = useState([]);
  const [paymentLogs, setPaymentLogs] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [roleEdit, setRoleEdit] = useState({ role: "", schoolId: "" });

  useEffect(() => {
    if (!user || !isAdmin(user)) { navigate("/dashboard"); return; }
    fetchData();
  }, [user]);

  async function fetchData() {
    setLoading(true);
    try {
      const [logResult, userResult, sesResult, mockResult] = await Promise.allSettled([
        getDocs(query(collection(db, "activityLog"), orderBy("timestamp", "desc"), limit(100))),
        getDocs(query(collection(db, "users"), limit(200))),
        getDocs(query(collection(db, "sessions"), limit(100))),
        getDocs(query(collection(db, "mockExams"), limit(100))),
      ]);
      const users = userResult.status === "fulfilled" ? userResult.value.docs.map(d => ({ id: d.id, ...d.data() })) : [];
      const allLogs = logResult.status === "fulfilled" ? logResult.value.docs.map(d => ({ id: d.id, ...d.data() })) : [];

      setLogs(allLogs);
      setPaymentLogs(allLogs.filter(l => l.action?.includes("payment")));
      setUsersList(users);

      let totalQuestions = 0;
      let totalXP = 0;
      users.forEach(u => {
        totalQuestions += u.totalQuestions || u.stats?.totalQuestions || 0;
        totalXP += u.xp || u.totalXP || 0;
      });

      setStats({
        users: users.length,
        sessions: sesResult.status === "fulfilled" ? sesResult.value.size : 0,
        mockExams: mockResult.status === "fulfilled" ? mockResult.value.size : 0,
        proUsers: users.filter(u => {
          const sub = u.subscription;
          if (sub?.status === "active" && sub.endDate) {
            const end = sub.endDate?.toDate ? sub.endDate.toDate() : new Date(sub.endDate);
            return end > new Date();
          }
          return false;
        }).length,
        totalQuestions,
        totalXP,
        totalPayments: allLogs.filter(l => l.action?.includes("payment")).length,
      });
    } catch (e) {
      console.error("Admin fetch error:", e);
    }
    setLoading(false);
  }

  async function loadUserActivity(targetUser) {
    setSelectedUser(targetUser);
    setRoleEdit({ role: targetUser.role || "user", schoolId: targetUser.schoolId || "" });
    // Compliance: every admin read of user data is logged with a reason
    logActivity({
      action: "admin_user_read",
      userId: user?.uid,
      email: user?.email,
      details: { targetUserId: targetUser.id, targetUserEmail: targetUser.email, reason: "support drill-down" },
    }).catch(() => {});
    try {
      const [userLogResult, sesResult, mockResult] = await Promise.allSettled([
        getDocs(query(collection(db, "activityLog"), where("userId", "==", targetUser.id), limit(50))),
        getDocs(query(collection(db, "sessions"), where("userId", "==", targetUser.id), limit(50))),
        getDocs(query(collection(db, "mockExams"), where("userId", "==", targetUser.id), limit(50))),
      ]);

      const userLogs = userLogResult.status === "fulfilled" ? userLogResult.value.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)) : [];
      const sessions = sesResult.status === "fulfilled" ? sesResult.value.docs.map(d => ({ id: d.id, ...d.data(), type: "session" })) : [];
      const mocks = mockResult.status === "fulfilled" ? mockResult.value.docs.map(d => ({ id: d.id, ...d.data(), type: "mock" })) : [];

      setUserActivity([...userLogs, ...sessions, ...mocks].sort((a, b) => {
        const ta = a.timestamp?.toDate?.() || new Date(0);
        const tb = b.timestamp?.toDate?.() || new Date(0);
        return tb - ta;
      }));

      setUserStats({
        totalQuestions: targetUser.totalQuestions || targetUser.stats?.totalQuestions || 0,
        sessions: sessions.length,
        mockExams: mocks.length,
        xp: targetUser.xp || targetUser.totalXP || 0,
        level: targetUser.level || 1,
        streak: targetUser.streak || targetUser.currentStreak || 0,
        assignments: targetUser.assignments || targetUser.assignmentHistory || [],
      });
    } catch (e) {
      console.error("Load user activity error:", e);
    }
  }

  function formatDate(ts) {
    if (!ts?.toDate) return "—";
    return ts.toDate().toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  function formatDateShort(ts) {
    if (!ts?.toDate) return "—";
    return ts.toDate().toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }

  function getActionColor(action) {
    if (!action) return "var(--text-muted)";
    switch (action) {
      case "register": return "#4ADE80";
      case "login": return "var(--primary)";
      case "logout": return "#FF4D6A";
      case "session_complete": return "var(--accent)";
      case "payment_success": return "#4ADE80";
      case "payment_failed": case "payment_initiated": return "#FF4D6A";
      case "payment": case "payment_pending": return "#FF9F43";
      case "admin_pro_grant": return "var(--accent)";
      case "admin_pro_revoke": return "#FF4D6A";
      case "question_answered": return "var(--primary)";
      case "mock_exam_complete": return "#4ADE80";
      case "assignment_created": case "assignment_completed": return "#00BFFF";
      default: return "var(--text-muted)";
    }
  }

  function getUserSubStatus(u) {
    const sub = u.subscription;
    if (sub?.status === "active" && sub.endDate) {
      const end = sub.endDate?.toDate ? sub.endDate.toDate() : new Date(sub.endDate);
      if (end > new Date()) {
        const daysLeft = Math.ceil((end - new Date()) / (1000 * 60 * 60 * 24));
        return { label: "Pro", color: "#4ADE80", daysLeft };
      }
      return { label: "Expired", color: "#FF9F43" };
    }
    return { label: "Free", color: "var(--text-muted)" };
  }

  async function assignPro(targetUser) {
    setAssigning(true);
    try {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + assignDays);

      await updateDoc(doc(db, "users", targetUser.id), {
        subscription: {
          plan: assignPlan,
          status: "active",
          reference: `ADMIN-${user.uid}-${Date.now()}`,
          startDate: serverTimestamp(),
          endDate,
          autoRenew: false,
          grantedBy: user.uid,
          grantedByName: user.displayName || user.email,
          proFeatures: FULL_PRO_FEATURES,
        },
        plan: "pro",
        planExpiry: endDate.toISOString(),
        proFeatures: FULL_PRO_FEATURES,
      });

      logActivity({
        action: "admin_pro_grant",
        userId: user.uid,
        email: user.email,
        details: {
          targetUserId: targetUser.id,
          targetUserEmail: targetUser.email,
          plan: assignPlan,
          days: assignDays,
          endDate: endDate.toISOString(),
          features: FULL_PRO_FEATURES,
        },
      });

      showToast(`Pro access granted to ${targetUser.email || targetUser.name} for ${assignDays} days (ALL features unlocked)`, "success");
      setAssignModal(null);
      fetchData();
    } catch (e) {
      console.error("Assign pro error:", e);
      showToast("Failed to assign pro access", "error");
    }
    setAssigning(false);
  }

  async function revokePro(targetUser) {
    try {
      await updateDoc(doc(db, "users", targetUser.id), {
        subscription: { status: "revoked" },
        plan: null,
        planExpiry: null,
        proFeatures: null,
      });

      logActivity({
        action: "admin_pro_revoke",
        userId: user.uid,
        email: user.email,
        details: { targetUserId: targetUser.id, targetUserEmail: targetUser.email },
      });

      showToast(`Pro access revoked for ${targetUser.email || targetUser.name}`, "success");
      fetchData();
    } catch (e) {
      console.error("Revoke pro error:", e);
      showToast("Failed to revoke pro access", "error");
    }
  }

  function showToast(message, type = "info") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  const filteredUsers = searchQuery
    ? usersList.filter(u =>
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : usersList;

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid var(--border)", borderTopColor: "var(--primary)", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: 24, fontFamily: "'Inter', system-ui, sans-serif", color: "var(--text)" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => navigate("/dashboard")} style={{ background: "var(--border)", border: "none", color: "var(--text-muted)", padding: "10px 14px", borderRadius: 10, cursor: "pointer" }}>
              <ArrowLeft size={18} />
            </button>
            <Shield size={28} color="var(--primary)" />
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Management Console</h1>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Manage users, assign Pro, monitor activity & payments</p>
            </div>
          </div>
          <button onClick={fetchData} style={{ background: "var(--border)", border: "none", color: "var(--text-muted)", padding: "10px 14px", borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit", fontSize: 13 }}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 32 }}>
          {[
            { label: "Total Users", value: stats.users, icon: Users, color: "var(--primary)" },
            { label: "Pro Users", value: stats.proUsers, icon: Crown, color: "var(--accent)" },
            { label: "Questions Answered", value: stats.totalQuestions.toLocaleString(), icon: BookOpen, color: "#4ADE80" },
            { label: "Sessions (recent 100)", value: stats.sessions, icon: ClipboardList, color: "#FF9F43" },
            { label: "Mock Exams (recent 100)", value: stats.mockExams, icon: Zap, color: "#FF4D6A" },
            { label: "Total XP Earned", value: stats.totalXP.toLocaleString(), icon: Award, color: "#00BFFF" },
            { label: "Payments", value: stats.totalPayments, icon: CreditCard, color: "var(--accent)" },
            { label: "Activity Events", value: logs.length, icon: Activity, color: "var(--text-muted)" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={20} color={color} />
                </div>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#fff" }}>{value}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          {[
            { id: "overview", label: "Activity Log" },
            { id: "payments", label: `Payments (${paymentLogs.length})` },
            { id: "users", label: `Users (${usersList.length})` },
            { id: "pro", label: `Pro Management (${stats.proUsers})` },
            { id: "media", label: "Landing Media" },
            { id: "teams", label: "Teams" },
            { id: "content", label: "Updates & Feedback" },
            { id: "compliance", label: "Compliance" },
            { id: "training", label: "AI Training Data" },
            { id: "teachers", label: "Teacher Invites" },
            { id: "dev", label: "Developer" },
            { id: "branding", label: "Branding" },
            { id: "analytics", label: "Analytics" },
            { id: "aiUsage", label: "AI Usage" },
            { id: "userDetail", label: "User Details" },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: "10px 20px", borderRadius: 10, border: "none", cursor: "pointer",
              background: activeTab === tab.id ? "var(--primary)" : "var(--border)",
              color: activeTab === tab.id ? "#fff" : "var(--text-muted)",
              fontWeight: 600, fontSize: 13, fontFamily: "inherit", transition: "all 0.2s"
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        {(activeTab === "users" || activeTab === "pro") && (
          <div style={{ marginBottom: 16, position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: "100%", padding: "12px 16px 12px 40px", borderRadius: 12,
                background: "var(--bg-2)", border: "1px solid var(--border)", color: "#fff",
                fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box",
              }}
            />
          </div>
        )}

        {/* Network Diagnostic */}
        <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Network Diagnostics</div>
          <NetworkDiagnostic />
        </div>

        {/* Activity Log Tab */}
        {activeTab === "overview" && (
          <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: 20, borderBottom: "1px solid var(--border)", fontSize: 14, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>
              All Activity ({logs.length})
            </div>
            {logs.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>No activity logged yet.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["Action", "User", "Email", "Details", "Time"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => (
                      <tr key={log.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ padding: "4px 10px", borderRadius: 6, background: `${getActionColor(log.action)}15`, color: getActionColor(log.action), fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", color: "var(--text)", fontWeight: 500 }}>{log.userId?.slice(0, 12)}...</td>
                        <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>{log.email || "—"}</td>
                        <td style={{ padding: "12px 16px", color: "var(--text-muted)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {log.details ? JSON.stringify(log.details).slice(0, 80) : "—"}
                        </td>
                        <td style={{ padding: "12px 16px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{formatDate(log.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Payment Tracking Tab */}
        {activeTab === "payments" && (
          <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: 20, borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>
                Payment Activity ({paymentLogs.length})
              </span>
              <div style={{ display: "flex", gap: 16 }}>
                <span style={{ color: "#4ADE80", fontSize: 12, fontWeight: 600 }}>
                  Success: {paymentLogs.filter(l => l.action?.includes("success")).length}
                </span>
                <span style={{ color: "#FF4D6A", fontSize: 12, fontWeight: 600 }}>
                  Failed: {paymentLogs.filter(l => l.action?.includes("failed")).length}
                </span>
                <span style={{ color: "#FF9F43", fontSize: 12, fontWeight: 600 }}>
                  Pending: {paymentLogs.filter(l => l.action?.includes("pending") || l.action?.includes("initiated")).length}
                </span>
              </div>
            </div>
            {paymentLogs.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>No payment activity recorded.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["Status", "User", "Email", "Amount", "Reference", "Details", "Time"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paymentLogs.map(log => (
                      <tr key={log.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ padding: "4px 10px", borderRadius: 6, background: `${getActionColor(log.action)}15`, color: getActionColor(log.action), fontSize: 11, fontWeight: 700, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 4 }}>
                            {log.action?.includes("success") ? <CheckCircle size={12} /> : log.action?.includes("failed") ? <XCircle size={12} /> : <Clock size={12} />}
                            {log.action}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", color: "var(--text)", fontWeight: 500 }}>{log.userId?.slice(0, 12)}...</td>
                        <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>{log.email || "—"}</td>
                        <td style={{ padding: "12px 16px", color: "var(--accent)", fontWeight: 600 }}>
                          {log.details?.amount ? `₦${log.details.amount.toLocaleString()}` : log.details?.amount === 0 ? "₦0" : "—"}
                        </td>
                        <td style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: 11, fontFamily: "monospace" }}>
                          {log.details?.reference || log.details?.paystackRef || "—"}
                        </td>
                        <td style={{ padding: "12px 16px", color: "var(--text-muted)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {log.details ? JSON.stringify(log.details).slice(0, 100) : "—"}
                        </td>
                        <td style={{ padding: "12px 16px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{formatDate(log.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: 20, borderBottom: "1px solid var(--border)", fontSize: 14, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>
              Registered Users ({filteredUsers.length})
            </div>
            {filteredUsers.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>No users found.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["Name", "Email", "Exam", "Role", "Status", "Questions", "Sessions", "XP", "Level", "Joined", "Actions"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => {
                      const subStatus = getUserSubStatus(u);
                      return (
                        <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "12px 16px", color: "#fff", fontWeight: 600 }}>{u.name || "—"}</td>
                          <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>{u.email || "—"}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ padding: "2px 8px", borderRadius: 4, background: "rgb(var(--primary-rgb) / 0.15)", color: "var(--primary)", fontSize: 11, fontWeight: 600 }}>{u.exam || "—"}</span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ padding: "2px 8px", borderRadius: 4, background: u.role === "admin" ? "rgb(var(--accent-rgb) / 0.15)" : "rgba(255,255,255,0.05)", color: u.role === "admin" ? "var(--accent)" : "var(--text-muted)", fontSize: 11, fontWeight: 600, textTransform: "capitalize" }}>
                              {u.role || "user"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ padding: "2px 8px", borderRadius: 4, background: `${subStatus.color}15`, color: subStatus.color, fontSize: 11, fontWeight: 600 }}>
                              {subStatus.label}{subStatus.daysLeft ? ` (${subStatus.daysLeft}d)` : ""}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", color: "var(--text)", fontWeight: 500, fontSize: 12 }}>{u.totalQuestions || u.stats?.totalQuestions || 0}</td>
                          <td style={{ padding: "12px 16px", color: "var(--text)", fontWeight: 500, fontSize: 12 }}>{u.stats?.totalSessions || 0}</td>
                          <td style={{ padding: "12px 16px", color: "var(--accent)", fontWeight: 500, fontSize: 12 }}>{(u.xp || u.totalXP || 0).toLocaleString()}</td>
                          <td style={{ padding: "12px 16px", color: "#00BFFF", fontWeight: 500, fontSize: 12 }}>{u.level || 1}</td>
                          <td style={{ padding: "12px 16px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{formatDate(u.createdAt)}</td>
                          <td style={{ padding: "12px 16px", display: "flex", gap: 6 }}>
                            <button
                              onClick={() => { setSelectedUser(u); loadUserActivity(u); setActiveTab("userDetail"); }}
                              style={{
                                padding: "6px 10px", borderRadius: 6, border: "none",
                                background: "rgb(var(--primary-rgb) / 0.15)", color: "var(--primary)",
                                fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                              }}
                            >
                              View
                            </button>
                            <button
                              onClick={() => { setAssignModal(u); setAssignDays(30); setAssignPlan("pro_monthly"); }}
                              style={{
                                padding: "6px 14px", borderRadius: 8, border: "none",
                                background: subStatus.label === "Pro" ? "rgb(var(--accent-rgb) / 0.15)" : "rgba(74,222,128,0.15)",
                                color: subStatus.label === "Pro" ? "var(--accent)" : "#4ADE80",
                                fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                                transition: "all 0.2s",
                              }}
                            >
                              {subStatus.label === "Pro" ? "Manage" : "Grant Pro"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Pro Management Tab */}
        {activeTab === "pro" && (
          <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: 20, borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>
                Pro Users ({filteredUsers.filter(u => getUserSubStatus(u).label === "Pro").length})
              </span>
              <span style={{ color: "#4ADE80", fontSize: 11, fontWeight: 600 }}>
                ALL features: Notepad, Study Plans, Analysis, All Subjects, AI Tutor, Mock Exams, Whiteboard, Hints, Assignments
              </span>
            </div>
            {filteredUsers.filter(u => getUserSubStatus(u).label === "Pro").length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>No active Pro users.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["Name", "Email", "Plan", "Days Left", "Features", "Granted By", "Actions"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.filter(u => getUserSubStatus(u).label === "Pro").map(u => {
                      const sub = u.subscription;
                      const end = sub?.endDate?.toDate ? sub.endDate.toDate() : sub?.endDate ? new Date(sub.endDate) : null;
                      const daysLeft = end ? Math.max(0, Math.ceil((end - new Date()) / (1000 * 60 * 60 * 24))) : 0;
                      const features = sub?.proFeatures || u.proFeatures || {};
                      return (
                        <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "12px 16px", color: "#fff", fontWeight: 600 }}>{u.name || "—"}</td>
                          <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>{u.email || "—"}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ padding: "2px 8px", borderRadius: 4, background: "rgb(var(--accent-rgb) / 0.15)", color: "var(--accent)", fontSize: 11, fontWeight: 600 }}>
                              {sub?.plan || "—"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ color: daysLeft < 3 ? "#FF4D6A" : "#4ADE80", fontWeight: 600, fontSize: 13 }}>
                              {daysLeft}d
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                              {Object.entries(FULL_PRO_FEATURES).map(([key, val]) => (
                                <span key={key} style={{
                                  padding: "2px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700,
                                  background: features[key] ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.05)",
                                  color: features[key] ? "#4ADE80" : "var(--text-muted)",
                                }}>
                                  {key}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: 11 }}>
                            {sub?.grantedByName || "Paystack"}
                          </td>
                          <td style={{ padding: "12px 16px", display: "flex", gap: 8 }}>
                            <button
                              onClick={() => { setAssignModal(u); setAssignDays(30); setAssignPlan("pro_monthly"); }}
                              style={{
                                padding: "6px 12px", borderRadius: 6, border: "none",
                                background: "rgb(var(--primary-rgb) / 0.15)", color: "var(--primary)",
                                fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                              }}
                            >
                              Extend
                            </button>
                            <button
                              onClick={() => revokePro(u)}
                              style={{
                                padding: "6px 12px", borderRadius: 6, border: "none",
                                background: "rgba(255,77,106,0.15)", color: "#FF4D6A",
                                fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                              }}
                            >
                              Revoke
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Training Data Tab */}
        {activeTab === "training" && (
          <AdminTrainingData />
        )}

        {/* Teacher Invites Tab */}
        {activeTab === "teachers" && (
          <AdminTeachers />
        )}

        {/* Developer Tab */}
        {activeTab === "dev" && (
          <AdminDevSettings />
        )}

        {/* Branding Tab */}
        {activeTab === "branding" && <AdminBranding />}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <AdminAnalytics />
        )}

        {/* AI Usage Tab */}
        {activeTab === "aiUsage" && (
          <AdminAIUsage />
        )}

        {/* Landing Media Tab */}
        {activeTab === "media" && (
          <AdminMedia />
        )}

        {/* Teams Tab */}
        {activeTab === "teams" && (
          <AdminTeams />
        )}

        {/* Content Tab */}
        {activeTab === "content" && (
          <AdminContent />
        )}

        {/* Compliance Tab */}
        {activeTab === "compliance" && (
          <AdminCompliance adminUser={user} usersList={usersList} logs={logs} showToast={showToast} />
        )}

        {/* User Detail Tab */}
        {activeTab === "userDetail" && (
          <div style={{ display: "grid", gap: 20 }}>
            {!selectedUser ? (
              <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 16, padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
                Select a user from the Users tab to view their details.
              </div>
            ) : (
              <>
                {/* User Profile Card */}
                <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 16, padding: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgb(var(--primary-rgb) / 0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "var(--primary)" }}>
                        {(selectedUser.name || selectedUser.email || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{selectedUser.name || "Unknown"}</h2>
                        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>{selectedUser.email}</p>
                        <span style={{ padding: "2px 8px", borderRadius: 4, background: `${getUserSubStatus(selectedUser).color}15`, color: getUserSubStatus(selectedUser).color, fontSize: 11, fontWeight: 600, marginTop: 4, display: "inline-block" }}>
                          {getUserSubStatus(selectedUser).label}{getUserSubStatus(selectedUser).daysLeft ? ` (${getUserSubStatus(selectedUser).daysLeft}d)` : ""}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => { setAssignModal(selectedUser); setAssignDays(30); setAssignPlan("pro_monthly"); }} style={{
                      padding: "10px 20px", borderRadius: 10, border: "none",
                      background: "linear-gradient(135deg, var(--primary), var(--accent))",
                      color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                    }}>
                      <Crown size={14} style={{ marginRight: 6 }} />
                      Grant Pro Access
                    </button>
                    <button onClick={() => setViewingAs(selectedUser)} style={{
                      padding: "10px 20px", borderRadius: 10, border: "1px solid #333",
                      background: "var(--border)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                    }}>
                      <Eye size={14} style={{ marginRight: 6 }} />
                      View as User
                    </button>
                  </div>

                  {/* Role & school editor */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>ROLE:</span>
                    <select value={roleEdit.role} onChange={(e) => setRoleEdit((r) => ({ ...r, role: e.target.value }))}
                      style={{ background: "var(--bg)", border: "1px solid #333", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 13, outline: "none", fontFamily: "inherit" }}>
                      <option value="user">Student (user)</option>
                      <option value="teacher">Teacher</option>
                    </select>
                    <input value={roleEdit.schoolId} onChange={(e) => setRoleEdit((r) => ({ ...r, schoolId: e.target.value }))}
                      placeholder="schoolId (for teachers)"
                      style={{ background: "var(--bg)", border: "1px solid #333", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 13, outline: "none", fontFamily: "inherit", minWidth: 200 }} />
                    <button onClick={async () => {
                      try {
                        await updateDoc(doc(db, "users", selectedUser.id), { role: roleEdit.role, schoolId: roleEdit.schoolId.trim() || null });
                        setUsersList((list) => list.map((u) => u.id === selectedUser.id ? { ...u, role: roleEdit.role, schoolId: roleEdit.schoolId.trim() || null } : u));
                        setSelectedUser((s) => ({ ...s, role: roleEdit.role, schoolId: roleEdit.schoolId.trim() || null }));
                        logActivity({ action: "admin_role_change", userId: user?.uid, email: user?.email, details: { targetUserId: selectedUser.id, role: roleEdit.role, schoolId: roleEdit.schoolId.trim() || null, reason: "admin console" } }).catch(() => {});
                        showToast(`Role set to ${roleEdit.role} ✓`, "success");
                      } catch (e) {
                        showToast(`Failed: ${e.message}`, "error");
                      }
                    }} style={{ padding: "8px 18px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid var(--primary)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                      Save role
                    </button>
                    {selectedUser.role === "teacher" && (
                      <span style={{ fontSize: 11, color: "#4ADE80", fontWeight: 700 }}>TEACHER{selectedUser.schoolId ? ` · ${selectedUser.schoolId.slice(0, 8)}…` : ""}</span>
                    )}
                  </div>

                  {/* User Stats */}
                  {userStats && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
                      {[
                        { label: "Questions", value: userStats.totalQuestions.toLocaleString(), icon: BookOpen, color: "#4ADE80" },
                        { label: "Sessions", value: userStats.sessions, icon: ClipboardList, color: "var(--primary)" },
                        { label: "Mock Exams", value: userStats.mockExams, icon: Zap, color: "#FF4D6A" },
                        { label: "XP", value: userStats.xp.toLocaleString(), icon: Award, color: "var(--accent)" },
                        { label: "Level", value: userStats.level, icon: Crown, color: "#00BFFF" },
                        { label: "Streak", value: `${userStats.streak}d`, icon: Clock, color: "#FF9F43" },
                      ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} style={{ background: "var(--bg)", borderRadius: 12, padding: 16, border: "1px solid var(--border)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                            <Icon size={16} color={color} />
                            <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>{label}</span>
                          </div>
                          <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Assignment History */}
                {userStats?.assignments?.length > 0 && (
                  <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
                    <div style={{ padding: 20, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                      <ClipboardList size={16} color="#00BFFF" />
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>
                        Assignment History ({userStats.assignments.length})
                      </span>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid var(--border)" }}>
                            {["Title", "Subject", "Status", "Score", "Assigned", "Completed"].map(h => (
                              <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {userStats.assignments.map((a, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                              <td style={{ padding: "12px 16px", color: "#fff", fontWeight: 600 }}>{a.title || "—"}</td>
                              <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>{a.subject || "—"}</td>
                              <td style={{ padding: "12px 16px" }}>
                                <span style={{
                                  padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                                  background: a.status === "completed" ? "rgba(74,222,128,0.15)" : a.status === "in_progress" ? "rgba(255,159,67,0.15)" : "rgba(136,136,136,0.15)",
                                  color: a.status === "completed" ? "#4ADE80" : a.status === "in_progress" ? "#FF9F43" : "var(--text-muted)",
                                  textTransform: "capitalize"
                                }}>
                                  {a.status || "pending"}
                                </span>
                              </td>
                              <td style={{ padding: "12px 16px", color: "var(--accent)", fontWeight: 600 }}>{a.score != null ? `${a.score}%` : "—"}</td>
                              <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>{formatDate(a.assignedAt || a.createdAt)}</td>
                              <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>{formatDate(a.completedAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* User Activity */}
                <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
                  <div style={{ padding: 20, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                    <Activity size={16} color="var(--primary)" />
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>
                      User Activity ({userActivity.length})
                    </span>
                  </div>
                  {userActivity.length === 0 ? (
                    <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>No activity recorded for this user.</div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid var(--border)" }}>
                            {["Type", "Action", "Details", "Time"].map(h => (
                              <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {userActivity.map((item, idx) => (
                            <tr key={item.id || idx} style={{ borderBottom: "1px solid var(--border)" }}>
                              <td style={{ padding: "12px 16px" }}>
                                <span style={{
                                  padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                                  background: item.type === "session" ? "rgba(74,222,128,0.15)" : item.type === "mock" ? "rgba(255,77,106,0.15)" : "rgb(var(--primary-rgb) / 0.15)",
                                  color: item.type === "session" ? "#4ADE80" : item.type === "mock" ? "#FF4D6A" : "var(--primary)",
                                  textTransform: "uppercase"
                                }}>
                                  {item.type || "activity"}
                                </span>
                              </td>
                              <td style={{ padding: "12px 16px" }}>
                                <span style={{ padding: "4px 10px", borderRadius: 6, background: `${getActionColor(item.action)}15`, color: getActionColor(item.action), fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
                                  {item.action || item.title || "—"}
                                </span>
                              </td>
                              <td style={{ padding: "12px 16px", color: "var(--text-muted)", maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {item.details ? JSON.stringify(item.details).slice(0, 100) : item.score != null ? `Score: ${item.score}%` : "—"}
                              </td>
                              <td style={{ padding: "12px 16px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{formatDate(item.timestamp || item.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Assign Pro Modal */}
      {assignModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center",
          animation: "fadeIn 0.2s ease-out",
        }}>
          <div style={{
            background: "var(--bg)", borderRadius: 20, padding: 32, maxWidth: 460, width: "100%",
            border: "1px solid var(--border)", boxShadow: "0 24px 80px rgb(var(--primary-rgb) / 0.3)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Crown size={22} color="var(--accent)" />
                <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Grant Pro Access</h2>
              </div>
              <button onClick={() => setAssignModal(null)} style={{ background: "var(--bg-3)", border: "1px solid #333", color: "var(--text-muted)", width: 32, height: 32, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 16 }}>×</span>
              </button>
            </div>

            <div style={{ background: "var(--bg-2)", borderRadius: 12, padding: 16, marginBottom: 20, border: "1px solid var(--border)" }}>
              <div style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 4 }}>Granting to:</div>
              <div style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>{assignModal.name || "Unknown"}</div>
              <div style={{ color: "var(--text-muted)", fontSize: 12 }}>{assignModal.email}</div>
            </div>

            {/* Features being unlocked */}
            <div style={{ background: "var(--bg-2)", borderRadius: 12, padding: 16, marginBottom: 20, border: "1px solid var(--border)" }}>
              <div style={{ color: "#4ADE80", fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>ALL Features Will Be Unlocked</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {Object.keys(FULL_PRO_FEATURES).map(key => (
                  <span key={key} style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(74,222,128,0.15)", color: "#4ADE80", fontSize: 11, fontWeight: 600 }}>
                    ✓ {key}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Plan</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { id: "pro_monthly", label: "Monthly", days: 30 },
                  { id: "pro_yearly", label: "Yearly", days: 365 },
                  { id: "custom", label: "Custom" },
                ].map(p => (
                  <button key={p.id} onClick={() => { setAssignPlan(p.id); if (p.days) setAssignDays(p.days); }} style={{
                    flex: 1, padding: "10px 8px", borderRadius: 10, border: "none", cursor: "pointer",
                    background: assignPlan === p.id ? "var(--primary)" : "var(--bg-3)",
                    color: assignPlan === p.id ? "#fff" : "var(--text-muted)",
                    fontWeight: 600, fontSize: 12, fontFamily: "inherit", transition: "all 0.2s",
                  }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Duration (days)</label>
              <input
                type="number"
                value={assignDays}
                onChange={e => setAssignDays(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 10,
                  background: "var(--bg-3)", border: "1px solid #333", color: "#fff",
                  fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setAssignModal(null)} style={{
                flex: 1, padding: "12px", borderRadius: 10, border: "1px solid #333",
                background: "transparent", color: "var(--text-muted)", fontWeight: 600, fontSize: 14,
                cursor: "pointer", fontFamily: "inherit",
              }}>
                Cancel
              </button>
              <button onClick={() => assignPro(assignModal)} disabled={assigning} style={{
                flex: 1, padding: "12px", borderRadius: 10, border: "none",
                background: "linear-gradient(135deg, var(--primary), var(--accent))",
                color: "#fff", fontWeight: 700, fontSize: 14, cursor: assigning ? "not-allowed" : "pointer",
                opacity: assigning ? 0.7 : 1, fontFamily: "inherit",
              }}>
                {assigning ? "Granting..." : `Grant Pro (${assignDays}d) — All Features`}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingAs && (
        <AdminUserView userId={viewingAs.id} onClose={() => setViewingAs(null)} />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 10000,
          padding: "14px 20px", borderRadius: 12,
          background: toast.type === "success" ? "rgba(74,222,128,0.15)" : "rgba(255,77,106,0.15)",
          border: `1px solid ${toast.type === "success" ? "rgba(74,222,128,0.3)" : "rgba(255,77,106,0.3)"}`,
          color: toast.type === "success" ? "#4ADE80" : "#FF4D6A",
          fontWeight: 600, fontSize: 13, animation: "fadeIn 0.3s ease-out",
          backdropFilter: "blur(12px)",
        }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}