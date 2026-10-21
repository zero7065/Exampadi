import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { StudyProvider } from "./context/StudyContext";
import { ThemeProvider } from "./context/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import TeacherRoute from "./components/TeacherRoute";
import Navbar from "./components/Navbar";
import ScrollToTop from "./components/ScrollToTop";
import InstallPrompt from "./components/InstallPrompt";
import { useAuth } from "./context/AuthContext";
import { useBackButton } from "./hooks/useBackButton";
import { seedAdminAccount, isFirebaseConfigured } from "./firebaseConfig";
import { clearOldServiceWorker } from "./lib/clearCache";
import { useServiceWorkerUpdate } from "./hooks/useServiceWorkerUpdate";
import OfflineIndicator from "./components/OfflineIndicator";
import ContextualHelp from "./components/ContextualHelp";
import NewUserChecklist from "./components/NewUserChecklist";
import ConsentBar from "./components/ConsentBar";
import { flushTrainingQueue } from "./lib/aiTraining";
import { useToast } from "./components/Toast";

import GuideFab from "./components/GuideFab";

// Critical path — direct imports (auth shell only; landing is lazy for a lean entry chunk)
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import NotFoundPage from "./pages/NotFoundPage";

// Everything else lazy-loaded
const LandingPage = lazy(() => import("./pages/LandingPage"));
const SubjectSelector = lazy(() => import("./pages/SubjectSelector"));
const Practice = lazy(() => import("./pages/Practice"));
const CBTSimulator = lazy(() => import("./pages/CBTSimulator"));
const ResultPage = lazy(() => import("./pages/ResultPage"));
const StatsPage = lazy(() => import("./pages/StatsPage"));
const PastQuestionsPage = lazy(() => import("./pages/PastQuestionsPage"));
const PaymentPage = lazy(() => import("./pages/PaymentPage"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const NotepadPage = lazy(() => import("./pages/NotepadPage"));
const StudyPlanPage = lazy(() => import("./pages/StudyPlanPage"));
const SessionHistoryPage = lazy(() => import("./pages/SessionHistoryPage"));
const HelpPage = lazy(() => import("./pages/HelpPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const QuestionBank = lazy(() => import("./pages/QuestionBank"));
const PracticeSession = lazy(() => import("./pages/PracticeSession"));
const SessionSummary = lazy(() => import("./pages/SessionSummary"));
const MockExam = lazy(() => import("./pages/MockExam"));
const MockSummary = lazy(() => import("./pages/MockSummary"));
const AITutor = lazy(() => import("./pages/AITutor"));
const Progress = lazy(() => import("./pages/Progress"));
const Settings = lazy(() => import("./pages/Settings"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage"));
  const MasteryPage = lazy(() => import("./pages/MasteryPage"));
  const FlashcardsPage = lazy(() => import("./pages/FlashcardsPage"));
const StudyPartnersPage = lazy(() => import("./pages/StudyPartnersPage"));
const SharedTestPage = lazy(() => import("./pages/SharedTestPage"));
const AssignmentPage = lazy(() => import("./pages/AssignmentPage"));
const SchoolsLanding = lazy(() => import("./pages/schools/SchoolsLanding"));
const SchoolSignup = lazy(() => import("./pages/schools/SchoolSignup"));
const TeacherDashboard = lazy(() => import("./pages/schools/TeacherDashboard"));
const TeacherRegister = lazy(() => import("./pages/TeacherRegister"));
const ExamGenerator = lazy(() => import("./pages/schools/ExamGenerator"));
const ClassroomMode = lazy(() => import("./pages/schools/ClassroomMode"));
const ParentReports = lazy(() => import("./pages/schools/ParentReports"));
const JoinClass = lazy(() => import("./pages/schools/JoinClass"));
const PartnerDashboard = lazy(() => import("./pages/schools/PartnerDashboard"));
const DataExport = lazy(() => import("./pages/compliance/DataExport"));
const FriendChat = lazy(() => import("./pages/FriendChat"));
const TeamPage = lazy(() => import("./pages/TeamPage"));
const StudyRoom = lazy(() => import("./pages/StudyRoom"));
const Feed = lazy(() => import("./pages/Feed"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const ReferencePage = lazy(() => import("./pages/ReferencePage"));
const CBTGuidePage = lazy(() => import("./pages/CBTGuidePage"));
const IELTSPage = lazy(() => import("./pages/IELTSPage"));
const SATPage = lazy(() => import("./pages/SATPage"));

function PageLoader() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid var(--border)", borderTopColor: "var(--primary)", animation: "spin 0.8s linear infinite" }} />
    </div>
  );
}

function AuthAwareRoutes() {
  const { user, loading, isOffline, degraded } = useAuth();
  const { updateAvailable, applyUpdate } = useServiceWorkerUpdate();
  useBackButton();
  const location = useLocation();
  const { toast } = useToast();

  // 80% AI-credit soft warning — dispatched centrally from lib/ai.js.
  useEffect(() => {
    if (!user) return;
    const onSoft = (e) => {
      const c = e?.detail || {};
      toast({
        message: `Heads up: only ${c.available ?? "?"} AI messages left this cycle. When they run out, upgrade to Pro or grab a 50-message pack (₦1,500).`,
        type: "warning",
        duration: 7000,
      });
    };
    window.addEventListener("exampadi:ai-soft-warning", onSoft);
    return () => window.removeEventListener("exampadi:ai-soft-warning", onSoft);
  }, [user, toast]);


  useEffect(() => {
    if (loading) { document.title = "ExamPadi"; return; }
    const titles = {
      "/": "ExamPadi — Your Personal Tutor Buddy",
      "/auth": "Sign In — ExamPadi",
      "/onboarding": "Get Started — ExamPadi",
      "/dashboard": "Dashboard — ExamPadi",
      "/practice": "Practice — ExamPadi",
      "/practice-select": "Start Practice — ExamPadi",
      "/question-bank": "Question Bank — ExamPadi",
      "/session-summary": "Session Summary — ExamPadi",
      "/mock-exam": "Mock Exam — ExamPadi",
      "/mock-summary": "Exam Results — ExamPadi",
      "/ai-tutor": "AI Tutor — ExamPadi",
      "/progress": "Progress — ExamPadi",
      "/settings": "Settings — ExamPadi",
      "/select": "Select Subjects — ExamPadi",
      "/cbt": "Exam Mode — ExamPadi",
      "/stats": "Statistics — ExamPadi",
      "/profile": "Profile — ExamPadi",
      "/study-partners": "Study Partners — ExamPadi",
      "/shared-test": "Shared Test — ExamPadi",
      "/assignment": "Assignment — ExamPadi",
      "/flashcards": "Flashcards — ExamPadi",
      "/schools": "For Schools — ExamPadi",
      "/ielts": "IELTS Prep — ExamPadi",
      "/sat": "SAT Prep — ExamPadi",
      "/schools/signup": "Register School — ExamPadi",
      "/schools/partner": "Partner Dashboard — ExamPadi",
      "/teacher": "Teacher Dashboard — ExamPadi",
      "/teacher/exam-generator": "Exam Generator — ExamPadi",
      "/teacher/classroom": "Classroom Mode — ExamPadi",
      "/teacher/parent-reports": "Parent Reports — ExamPadi",
      "/join": "Join Class — ExamPadi",
      "/settings/data-export": "Export My Data — ExamPadi",
    };
    document.title = titles[location.pathname] || "ExamPadi — Your Personal Tutor Buddy";
  }, [location.pathname, loading]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-bg text-text selection:bg-primary/30">
      {isOffline && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
          background: "linear-gradient(135deg, #FF6B35, #e85d26)", color: "#fff", padding: "10px 16px",
          textAlign: "center", fontSize: 13, fontWeight: 600,
          fontFamily: "'Inter', system-ui, sans-serif",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#fff", animation: "pulse 1.5s infinite" }} />
          You're offline — check your internet connection. Tap the Network Diagnostic button for help.
        </div>
      )}
      {!isOffline && degraded && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
          background: "linear-gradient(135deg, #b45309, #d97706)", color: "#fff", padding: "10px 16px",
          textAlign: "center", fontSize: 13, fontWeight: 600,
          fontFamily: "'Inter', system-ui, sans-serif",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#fff", animation: "pulse 1.5s infinite" }} />
          Degraded connection — your network is blocking some Google services. Data will sync when reachable. Switch to mobile data if sessions expire.
        </div>
      )}
      <Navbar />
      <ScrollToTop />
      <GuideFab />
      <main className={`flex-1 ${user ? "md:ml-64 pb-20 md:pb-0" : ""} animate-fade`}>
        <InstallPrompt />
        <OfflineIndicator />
        <ContextualHelp />
        <NewUserChecklist />
        <ConsentBar />
        {updateAvailable && (
          <div style={{ position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 200, background: "var(--bg-2)", border: "1px solid var(--primary)", borderRadius: 12, padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
            <span style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>New version available</span>
            <button onClick={applyUpdate} style={{ background: "var(--primary)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Update</button>
          </div>
        )}
        <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={<ProtectedRoute />}>
            <Route index element={<Dashboard />} />
          </Route>
          <Route path="/select" element={<ProtectedRoute><SubjectSelector /></ProtectedRoute>} />
          <Route path="/practice-select" element={<ProtectedRoute><Practice /></ProtectedRoute>} />
          <Route path="/practice" element={<ProtectedRoute><PracticeSession /></ProtectedRoute>} />
          <Route path="/question-bank" element={<ProtectedRoute><QuestionBank /></ProtectedRoute>} />
          <Route path="/session-summary" element={<ProtectedRoute><SessionSummary /></ProtectedRoute>} />
          <Route path="/cbt" element={<ProtectedRoute><CBTSimulator /></ProtectedRoute>} />
          <Route path="/result" element={<ProtectedRoute><ResultPage /></ProtectedRoute>} />
          <Route path="/stats" element={<ProtectedRoute><StatsPage /></ProtectedRoute>} />
          <Route path="/past-questions" element={<ProtectedRoute><PastQuestionsPage /></ProtectedRoute>} />
          <Route path="/notepad" element={<ProtectedRoute><NotepadPage /></ProtectedRoute>} />
          <Route path="/study-plan" element={<ProtectedRoute><StudyPlanPage /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><SessionHistoryPage /></ProtectedRoute>} />
          <Route path="/help" element={<ProtectedRoute><HelpPage /></ProtectedRoute>} />
          <Route path="/mock-exam" element={<ProtectedRoute><MockExam /></ProtectedRoute>} />
          <Route path="/mock-summary" element={<ProtectedRoute><MockSummary /></ProtectedRoute>} />
          <Route path="/ai-tutor" element={<ProtectedRoute><AITutor /></ProtectedRoute>} />
          <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
          <Route path="/contact" element={<ProtectedRoute><ContactPage /></ProtectedRoute>} />
          <Route path="/payment" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
          <Route path="/mastery" element={<ProtectedRoute><MasteryPage /></ProtectedRoute>} />
          <Route path="/flashcards" element={<ProtectedRoute><FlashcardsPage /></ProtectedRoute>} />
          <Route path="/study-partners" element={<ProtectedRoute><StudyPartnersPage /></ProtectedRoute>} />
          <Route path="/friends/chat/:pairId" element={<ProtectedRoute><FriendChat /></ProtectedRoute>} />
          <Route path="/team/:teamId" element={<ProtectedRoute><TeamPage /></ProtectedRoute>} />
          <Route path="/room" element={<ProtectedRoute><StudyRoom /></ProtectedRoute>} />
          <Route path="/room/:code" element={<ProtectedRoute><StudyRoom /></ProtectedRoute>} />
          <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
          <Route path="/u/:uid" element={<ProtectedRoute><PublicProfile /></ProtectedRoute>} />
          <Route path="/reference" element={<ProtectedRoute><ReferencePage /></ProtectedRoute>} />
          <Route path="/guide/cbt" element={<ProtectedRoute><CBTGuidePage /></ProtectedRoute>} />
          <Route path="/ielts" element={<IELTSPage />} />
          <Route path="/sat" element={<SATPage />} />
          <Route path="/shared-test" element={<ProtectedRoute><SharedTestPage /></ProtectedRoute>} />
          <Route path="/assignment" element={<ProtectedRoute><AssignmentPage /></ProtectedRoute>} />
          <Route path="/payment/success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/settings/data-export" element={<ProtectedRoute><DataExport /></ProtectedRoute>} />

          {/* Schools (public) */}
          <Route path="/schools" element={<SchoolsLanding />} />
          <Route path="/schools/signup" element={<SchoolSignup />} />
          <Route path="/schools/partner" element={<ProtectedRoute><PartnerDashboard /></ProtectedRoute>} />
          <Route path="/teacher/register" element={<ProtectedRoute><TeacherRegister /></ProtectedRoute>} />

          {/* Teacher (role-gated) */}
          <Route path="/teacher" element={<TeacherRoute><TeacherDashboard /></TeacherRoute>} />
          <Route path="/teacher/exam-generator" element={<TeacherRoute><ExamGenerator /></TeacherRoute>} />
          <Route path="/teacher/classroom" element={<TeacherRoute><ClassroomMode /></TeacherRoute>} />
          <Route path="/teacher/parent-reports" element={<TeacherRoute><ParentReports /></TeacherRoute>} />
          {/* Student entry to a live classroom (shared link: /classroom?class=<id>) */}
          <Route path="/classroom" element={<ProtectedRoute><ClassroomMode /></ProtectedRoute>} />

          {/* Class join */}
          <Route path="/join" element={<ProtectedRoute><JoinClass /></ProtectedRoute>} />
          <Route path="/join/:code" element={<ProtectedRoute><JoinClass /></ProtectedRoute>} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>

        {/* Floating Jadai Studios credit */}
        {location.pathname !== "/" && location.pathname !== "/auth" && (
          <div style={{
            position: "fixed", bottom: 12, right: 16, zIndex: 40,
            pointerEvents: "none",
          }}>
            <span className="brand-shimmer" style={{
              fontSize: 9, fontWeight: 800, letterSpacing: "0.12em",
              textTransform: "uppercase", opacity: 0.4,
              fontFamily: "'Inter', system-ui, sans-serif",
            }}>
              Jadai Studios
            </span>
          </div>
        )}
      </main>
    </div>
  );
}

function App() {
  useEffect(() => {
    // Version-gated cleanup: runs the aggressive wipe at most once per
    // SW_VERSION, then registers the (self-contained) service worker.
    clearOldServiceWorker().then(() => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      }
    });
    flushTrainingQueue().catch(() => {});
    if (isFirebaseConfigured) {
      seedAdminAccount();
    }
  }, []);

  return (
    <ThemeProvider>
      <StudyProvider>
        <Router>
          <AuthAwareRoutes />
        </Router>
      </StudyProvider>
    </ThemeProvider>
  );
}

export default App;