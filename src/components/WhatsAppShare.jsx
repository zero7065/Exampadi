/* eslint-disable react-refresh/only-export-components */
import { MessageCircle, UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "./Toast";

function buildShareUrl(path) {
  const base = typeof window !== "undefined" ? window.location.origin : "https://exampadi.jadai.dev";
  return `${base}${path}`;
}

export function shareOnWhatsApp({ title, text, url }) {
  const message = `${title}\n\n${text}\n\n${url ? `🔗 ${url}` : ""}\n\n— ExamPadi`.trim();
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/?text=${encoded}`, "_blank");
}

export function WhatsAppShareButton({ result, type = "result", style = {} }) {
  const { user } = useAuth();
  const { toast } = useToast();

  function handleShare() {
    if (!user) {
      toast({ message: "Sign in to share your progress", type: "error" });
      return;
    }

    const name = user.displayName || "A student";
    let title;
    let text;
    let url;

    if (type === "result" && result) {
      title = `🎯 ${name} just scored ${result.percentageScore}% on ExamPadi!`;
      text = `✅ ${result.correctAnswers}/${result.totalQuestions} correct\n⏱ ${Math.floor(result.timeSpentSeconds / 60)}m ${result.timeSpentSeconds % 60}s`;
      url = buildShareUrl("/auth");
    } else if (type === "progress" && result) {
      title = `📈 ${name}'s ExamPadi Progress`;
      text = `🔥 ${result.streak || 0} day streak\n⭐ ${result.xp || 0} XP earned\n📊 ${result.totalQuestionsAnswered || 0} questions answered`;
      url = buildShareUrl("/auth");
    } else if (type === "mock" && result) {
      title = `🏆 ${name} scored ${result.percentageScore}% on a Mock Exam!`;
      text = `✅ ${result.correctAnswers}/${result.totalQuestions} correct\n⏱ ${Math.floor((result.timeSpentSeconds || 0) / 60)}m`;
      url = buildShareUrl("/auth");
    } else {
      title = `Check out ExamPadi — the best exam prep app!`;
      text = `Practice past questions, take mock exams, and get AI-powered explanations. Join me!`;
      url = buildShareUrl("/auth");
    }

    shareOnWhatsApp({ title, text, url });
    toast({ message: "Shared on WhatsApp!", type: "success" });
  }

  return (
    <button
      onClick={handleShare}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "10px 20px", borderRadius: 12,
        background: "linear-gradient(135deg, #25D366, #128C7E)",
        color: "#fff", fontWeight: 700, fontSize: 14,
        border: "none", cursor: "pointer",
        transition: "transform 0.2s, box-shadow 0.2s",
        ...style,
      }}
      onMouseEnter={(e) => { e.target.style.transform = "scale(1.03)"; e.target.style.boxShadow = "0 4px 20px rgba(37,211,102,0.4)"; }}
      onMouseLeave={(e) => { e.target.style.transform = "scale(1)"; e.target.style.boxShadow = "none"; }}
    >
      <MessageCircle size={18} />
      Share on WhatsApp
    </button>
  );
}

export function WhatsAppHelpButton({ subject, score, style = {} }) {
  const { user } = useAuth();
  const { toast } = useToast();

  function handleHelp() {
    if (!user) {
      toast({ message: "Sign in to ask for help", type: "error" });
      return;
    }

    const message = `Hi! I need help studying for ${subject || "my exams"} on ExamPadi.\n\nI scored ${score || "low"}% and could use a study partner.\n\nCan you help me study? Download ExamPadi and add me as your study partner!\n\n🔗 ${buildShareUrl("/auth")}`;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  }

  return (
    <button
      onClick={handleHelp}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "10px 20px", borderRadius: 12,
        background: "linear-gradient(135deg, var(--primary), var(--accent))",
        color: "#fff", fontWeight: 700, fontSize: 14,
        border: "none", cursor: "pointer",
        transition: "transform 0.2s, box-shadow 0.2s",
        ...style,
      }}
      onMouseEnter={(e) => { e.target.style.transform = "scale(1.03)"; e.target.style.boxShadow = "0 4px 20px rgb(var(--primary-rgb) / 0.4)"; }}
      onMouseLeave={(e) => { e.target.style.transform = "scale(1)"; e.target.style.boxShadow = "none"; }}
    >
      <UserPlus size={18} />
      Ask a Friend for Help
    </button>
  );
}

export function ShareResultsBar({ result, type = "result" }) {
  return (
    <div style={{
      display: "flex", gap: 12, flexWrap: "wrap",
      justifyContent: "center", padding: "16px 0",
    }}>
      <WhatsAppShareButton result={result} type={type} />
    </div>
  );
}
