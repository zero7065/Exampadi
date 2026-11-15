// src/pages/HelpPage.jsx
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import GuideAssistant from "../components/GuideAssistant";
import OnboardingTour from "../components/OnboardingTour";
import { Sparkles } from "lucide-react";
import {
  BookOpen,
  Target,
  Clock,
  Zap,
  BarChart3,
  StickyNote,
  Calendar,
  ChevronRight,
  CheckCircle,
  ArrowRight,
  MonitorPlay,
  LibraryBig,
  Newspaper,
  Gamepad2,
  MessagesSquare,
  Crown,
  Swords,
} from "lucide-react";

const HelpPage = () => {
  const navigate = useNavigate();
  const [showTour, setShowTour] = useState(false);

  const features = [
    {
      icon: <BookOpen size={24} />,
      title: "Practice Mode",
      description: "Select your exam type (JAMB, WAEC, NABTEB) and subjects. Answer questions at your own pace with detailed AI explanations.",
      action: "Start Practice",
      link: "/select"
    },
    {
      icon: <Zap size={24} />,
      title: "Exam Mode",
      description: "Experience the real exam environment with timed sessions. Perfect for building speed and exam stamina. (Pro Feature)",
      action: "Start CBT",
      link: "/select?mode=cbt",
      pro: true
    },
    {
      icon: <BarChart3 size={24} />,
      title: "Analytics & Stats",
      description: "Track your progress, see weak topics, and get AI-powered advice on areas to improve. (Pro Feature)",
      action: "View Stats",
      link: "/stats",
      pro: true
    },
    {
      icon: <StickyNote size={24} />,
      title: "Study Notepad",
      description: "Keep notes while you study. Save formulas, key points, and reminders. (Pro Feature)",
      action: "Open Notepad",
      link: "/notepad",
      pro: true
    },
    {
      icon: <Calendar size={24} />,
      title: "AI Study Plan",
      description: "Get a personalized day-by-day schedule based on your target score and exam date. (Pro Feature)",
      action: "Create Plan",
      link: "/study-plan",
      pro: true
    },
    {
      icon: <Clock size={24} />,
      title: "Session History",
      description: "Review all your past sessions, see which questions you got wrong, and learn from detailed explanations.",
      action: "View History",
      link: "/history"
    },
    {
      icon: <MonitorPlay size={24} />,
      title: "CBT Computer Guide",
      description: "Never used a CBT computer? Picture-by-picture walkthrough plus a safe interactive demo. Free for everyone.",
      action: "Learn CBT",
      link: "/guide/cbt"
    },
    {
      icon: <LibraryBig size={24} />,
      title: "Reference Library",
      description: "Formula sheets, constants, periodic table, grammar rules and key facts — searchable, works offline.",
      action: "Open Library",
      link: "/reference"
    },
    {
      icon: <Newspaper size={24} />,
      title: "Community Feed",
      description: "See top students, ask the community when stuck, and help others — a public study hall.",
      action: "Open Feed",
      link: "/feed"
    },
    {
      icon: <MessagesSquare size={24} />,
      title: "School Community",
      description: "Your school's private group chat with AI assist. Join after payment or admin approval — chat with classmates and teachers, share tips, and learn together. (Pro/School)",
      action: "Open Community",
      link: "/community",
      pro: true
    },
    {
      icon: <Gamepad2 size={24} />,
      title: "Games & Brain Training",
      description: "Play chess vs AI across 10 difficulty levels, plus trivia, brain teasers and pattern puzzles. Challenge friends and earn achievements. (Pro)",
      action: "Play Games",
      link: "/games",
      pro: true
    },
    {
      icon: <Swords size={24} />,
      title: "Challenge Friends",
      description: "Send game challenges to your study partners — chess or trivia. Accept, play, and like each other's wins. (Pro)",
      action: "Challenge",
      link: "/games",
      pro: true
    },
    {
      icon: <Crown size={24} />,
      title: "Legend Mode",
      description: "Learn any topic in a style that sticks — riddles, metaphors, poems, stories or edu-hacks. Adjust strictness from gentle to legend. (Pro)",
      action: "Try Legend Mode",
      link: "/legend",
      pro: true
    },
    {
      icon: <Target size={24} />,
      title: "Learning Patterns",
      description: "As you practice, we track your best study hours, weakest subjects and pace — and turn them into smart recommendations. (Pro)",
      action: "See Patterns",
      link: "/stats",
      pro: true
    },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-10 animate-fade">
      <header className="text-center">
        <h1 className="text-4xl font-black mb-4">How to Use ExamPadi</h1>
        <p className="text-text-muted text-lg max-w-2xl mx-auto">
          Your complete guide to mastering JAMB and WAEC exams
        </p>
        <button onClick={() => setShowTour(true)} className="btn-secondary mt-4 px-6">
          <Sparkles size={16} /> Replay the guided tour
        </button>
      </header>

      {showTour && <OnboardingTour onClose={() => setShowTour(false)} />}

      <GuideAssistant />

      {/* Free vs Pro Comparison */}
      <div className="glass-card p-8">
        <h2 className="text-2xl font-black mb-6 text-center">What's Included</h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-xl font-bold">
              <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">✓</div>
              Free Plan
            </div>
            <ul className="space-y-3 text-text-muted">
              <li className="flex items-center gap-2">
                <CheckCircle size={16} className="text-primary" />
                15 questions daily
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} className="text-primary" />
                3 AI messages daily
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} className="text-primary" />
                Basic explanations
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} className="text-primary" />
                Practice mode (all subjects)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} className="text-primary" />
                Session history & review
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} className="text-primary" />
                Progress tracking
              </li>
            </ul>
          </div>

          <div className="space-y-4 border-2 border-accent/30 rounded-2xl p-6 bg-accent/5">
            <div className="flex items-center gap-3 text-xl font-bold text-accent">
              <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center">👑</div>
              Pro Plan - ₦3,500/mo
            </div>
            <ul className="space-y-3 text-text-muted">
              <li className="flex items-center gap-2">
                <CheckCircle size={16} className="text-accent" />
                Unlimited questions
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} className="text-accent" />
                60–80 AI messages monthly
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} className="text-accent" />
                Advanced AI tutor
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} className="text-accent" />
                Exam Mode
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} className="text-accent" />
                Full analytics & weak topics
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} className="text-accent" />
                AI Study Plan generator
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} className="text-accent" />
                Study Notepad
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Feature Guides */}
      <div className="space-y-6">
        <h2 className="text-2xl font-black">All Features Guide</h2>
        
        {features.map((feature, index) => (
          <div 
            key={index} 
            className={`glass-card p-6 ${feature.pro ? 'border-accent/20' : ''}`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                feature.pro 
                  ? 'bg-accent/20 text-accent' 
                  : 'bg-primary/20 text-primary'
              }`}>
                {feature.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold">{feature.title}</h3>
                  {feature.pro && (
                    <span className="bg-accent/10 text-accent text-xs px-3 py-1 rounded-full font-black uppercase">
                      Pro
                    </span>
                  )}
                </div>
                <p className="text-text-muted mb-4">{feature.description}</p>
                <button 
                  onClick={() => navigate(feature.link)}
                  className="flex items-center gap-2 text-primary font-bold hover:underline"
                >
                  {feature.action} <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tips Section */}
      <div className="glass-card p-8 bg-gradient-to-br from-primary-dim to-transparent border-primary/20">
        <h2 className="text-2xl font-black mb-6">Study Tips for Success</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex gap-3">
              <span className="text-2xl">🎯</span>
              <div>
                <h4 className="font-bold">Set a Target Score</h4>
                <p className="text-sm text-text-muted">Know your goal - 300+ for top universities</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-2xl">📅</span>
              <div>
                <h4 className="font-bold">Study Daily</h4>
                <p className="text-sm text-text-muted">30 mins - 1 hour consistent practice beats cramming</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex gap-3">
              <span className="text-2xl">📝</span>
              <div>
                <h4 className="font-bold">Review Mistakes</h4>
                <p className="text-sm text-text-muted">Use the detailed explanations to understand why you got questions wrong</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-2xl">🔥</span>
              <div>
                <h4 className="font-bold">Build Your Streak</h4>
                <p className="text-sm text-text-muted">Maintain a daily study streak for better habits</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <button onClick={() => navigate("/select")} className="btn-primary px-10 py-4 text-lg">
          Start Learning Now 🚀
        </button>
      </div>
    </div>
  );
};

export default HelpPage;