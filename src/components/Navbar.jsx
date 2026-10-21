// src/components/Navbar.jsx
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSubscription } from "../hooks/useSubscription";
import { useTheme } from "../context/ThemeContext";
import AvatarDisplay from "./Avatar/AvatarDisplay";
import Logo from "./Logo";
import { isAdmin } from "../lib/activityLog";
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  User,

  Crown,
  History,
  Moon,
  Sun,
  Zap,
  StickyNote,
  Clock,
  HelpCircle,
  Bot,
  MessageSquare,
  MessagesSquare,
  Trophy,
  Target,
  Users,
  ClipboardList,
  Layers,
  Menu,
  X,
  Settings,
  LineChart,
  FileText,
  FlaskConical,
  GraduationCap,
  ShieldCheck,
  Newspaper,
  LibraryBig,
  MonitorPlay,
  Plane
} from "lucide-react";

const Navbar = () => {
  const { user } = useAuth();
  const { isPro: proStatus, profile } = useSubscription();
  const isTeacher = profile?.role === "teacher" || isAdmin(user);
  const isAdminUser = isAdmin(user);
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  // IELTS/SAT are international exams — hidden from the menu by default,
  // revealed when the student turns them on in Settings → Profile.
  const showIntlExams = profile?.preferences?.showIntlExams === true;

  // Organized navigation: grouped sections so students AND teachers
  // find things fast. Flat navItems derived below for active-state logic.
  const navSections = user ? [
    {
      title: "Learn",
      items: [
        { name: "Home", path: "/dashboard", icon: LayoutDashboard },
        { name: "Practice", path: "/select", icon: Zap },
        { name: "Question Bank", path: "/question-bank", icon: BookOpen },
        { name: "Flashcards", path: "/flashcards", icon: Layers },
        { name: "Study Plan", path: "/study-plan", icon: FileText },
        { name: "CBT Guide", path: "/guide/cbt", icon: MonitorPlay },
        { name: "Reference", path: "/reference", icon: LibraryBig },
        ...(showIntlExams ? [
          { name: "IELTS", path: "/ielts", icon: Plane },
          { name: "SAT", path: "/sat", icon: GraduationCap },
        ] : []),
      ],
    },
    {
      title: "AI & Insights",
      items: [
        { name: "AI Tutor", path: "/ai-tutor", icon: Bot },
        { name: "Mastery", path: "/mastery", icon: Target },
        { name: "Stats", path: "/stats", icon: BarChart3 },
        { name: "Progress", path: "/progress", icon: LineChart },
        { name: "History", path: "/history", icon: Clock },
      ],
    },
    {
      title: "Community",
      items: [
        { name: "Leaderboard", path: "/leaderboard", icon: Trophy },
        { name: "Feed", path: "/feed", icon: Newspaper },
        { name: "Study Room", path: "/room", icon: MessagesSquare },
        { name: "Partners", path: "/study-partners", icon: Users, requiresPro: true },
        ...(isTeacher ? [{ name: "Teacher", path: "/teacher", icon: GraduationCap }] : []),
        ...(isAdminUser ? [{ name: "Admin", path: "/admin", icon: ShieldCheck }] : []),
      ],
    },
    {
      title: "Pro Tools",
      items: [
        { name: "Notepad", path: "/notepad", icon: StickyNote, requiresPro: true },
        { name: "Assignment", path: "/assignment", icon: ClipboardList, requiresPro: true },
        { name: "Mock Exam", path: "/mock-exam", icon: FlaskConical, requiresPro: true },
        { name: "Past Questions", path: "/past-questions", icon: History, requiresPro: true },
      ],
    },
    {
      title: "Account",
      items: [
        { name: "Help", path: "/help", icon: HelpCircle },
        { name: "Contact", path: "/contact", icon: MessageSquare },
        { name: "Profile", path: "/profile", icon: User },
        { name: "Settings", path: "/settings", icon: Settings },
      ],
    },
  ] : [];

  const mobilePrimary = user ? [
    { name: "Home", path: "/dashboard", icon: LayoutDashboard },
    { name: "Practice", path: "/select", icon: Zap },
    { name: "AI Tutor", path: "/ai-tutor", icon: Bot },
    { name: "Stats", path: "/stats", icon: BarChart3 },
  ] : [];

  const moreSections = user
    ? navSections
        .map((s) => ({
          ...s,
          items: s.items.filter(i => !mobilePrimary.some(p => p.path === i.path)),
        }))
        .filter(s => s.items.length > 0)
    : [];
  const moreItems = moreSections.flatMap((s) => s.items);
  const isMoreActive = user && moreItems.some(i => location.pathname === i.path);

  // Guest mobile top bar (rendered even when logged out)
  if (!user) {
    return (
      <nav className="md:hidden fixed top-0 left-0 right-0 p-4 flex items-center justify-between z-50 bg-bg/80 backdrop-blur-md border-b border-border">
        <Link to="/" className="flex items-center gap-3">
          <Logo size={32} radius={9} />
          <span className="font-black text-text">ExamPadi</span>
        </Link>
        <button onClick={toggle} aria-label="Toggle theme" className="p-2 text-text-muted hover:text-primary transition-colors">
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </nav>
    );
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex flex-col w-64 h-screen bg-bg-2 border-r border-border fixed left-0 top-0 p-6 z-50">
        <div className="flex items-center justify-between mb-6 px-2 shrink-0">
          <Link to="/" className="flex items-center gap-3">
            <Logo size={32} radius={9} />
            <h1 className="text-xl font-black tracking-tight text-text">ExamPadi</h1>
          </Link>
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="p-2 hover:bg-subtle rounded-lg transition-colors text-text-muted hover:text-primary"
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <Link to="/profile" title="Your profile" className="hover:opacity-80 transition-opacity">
            <AvatarDisplay user={user} size={32} radius={10} />
          </Link>
        </div>

        <div className="flex-1 min-h-0 space-y-4 overflow-y-auto pr-1 pb-4">
          {navSections.map((section) => (
            <div key={section.title}>
              <div className="px-4 mb-1 text-[10px] font-black uppercase tracking-widest text-text-muted/70">
                {section.title}
              </div>
              <div className="space-y-2">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  const isLocked = item.requiresPro && !proStatus;

                  return (
                    <Link
                      key={item.path}
                      to={isLocked ? "/payment" : item.path}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-bold ${
                        isActive
                        ? "bg-primary text-black shadow-lg shadow-primary/20"
                        : isLocked
                        ? "text-text-muted/50 cursor-not-allowed"
                        : "text-text-muted hover:bg-subtle hover:text-text"
                      }`}
                    >
                      <Icon size={20} className={isLocked ? "opacity-50" : ""} />
                      <span className={isLocked ? "opacity-50" : ""}>{item.name}</span>
                      {isLocked && <span className="ml-auto text-xs">🔒</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-4 border-t border-border space-y-4 shrink-0">
          {!proStatus && (
<Link
              to="/payment"
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-accent to-orange-500 py-3 rounded-xl font-black shadow-lg shadow-accent/20 hover:scale-[1.02] transition-all"
              style={{ color: "#000" }}
>
              <Crown size={18} />
              Go Pro
            </Link>
          )}

          <div className="text-center pt-2">
            <span className="brand-shimmer text-[10px] font-black tracking-wider opacity-60 hover:opacity-100 transition-opacity cursor-default">
              ExamPadi · Built in Nigeria
            </span>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-bg-2 border-t border-border flex items-center justify-around p-2 z-50 backdrop-blur-xl safe-bottom">
        {mobilePrimary.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg transition-all flex-1 min-w-0 ${
                isActive ? "text-primary scale-105" : "text-text-muted"
              }`}
            >
              <Icon size={22} />
              <span className="text-[10px] font-bold truncate w-full text-center">{item.name}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          aria-label="More"
          className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg transition-all flex-1 min-w-0 ${
            isMoreActive ? "text-primary scale-105" : "text-text-muted"
          }`}
        >
          <Menu size={22} />
          <span className="text-[10px] font-bold truncate w-full text-center">More</span>
        </button>
      </nav>

      {/* Mobile "More" sheet */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-[70]" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto bg-bg-2 border-t border-border rounded-t-3xl p-5 pb-8 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-text">All Sections</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggle}
                  aria-label="Toggle theme"
                  className="p-2.5 rounded-xl bg-subtle text-text-muted hover:text-primary transition-colors"
                >
                  {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <button
                  onClick={() => setMoreOpen(false)}
                  aria-label="Close"
                  className="p-2.5 rounded-xl bg-subtle text-text-muted hover:text-danger transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {moreSections.map((section) => (
                <div key={section.title}>
                  <div className="px-1 mb-2 text-[10px] font-black uppercase tracking-widest text-text-muted/70">
                    {section.title}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      const isLocked = item.requiresPro && !proStatus;
                      return (
                        <Link
                          key={item.path}
                          to={isLocked ? "/payment" : item.path}
                          onClick={() => setMoreOpen(false)}
                          className={`flex items-center gap-2.5 px-4 py-3.5 rounded-xl font-bold text-sm transition-all ${
                            isActive
                              ? "bg-primary text-black"
                              : isLocked
                              ? "bg-subtle/50 text-text-muted/60"
                              : "bg-subtle text-text-muted"
                          }`}
                        >
                          <Icon size={18} className={`shrink-0 ${isLocked ? "opacity-50" : ""}`} />
                          <span className="truncate">{item.name}</span>
                          {isLocked && <span className="ml-auto text-xs">🔒</span>}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {!proStatus && (
              <Link
                to="/payment"
                onClick={() => setMoreOpen(false)}
                className="mt-4 flex items-center justify-center gap-2 bg-gradient-to-r from-accent to-orange-500 text-black py-3 rounded-xl font-black shadow-lg"
              >
                <Crown size={18} /> Go Pro
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
