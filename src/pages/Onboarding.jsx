import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createUserProfile, getUserProfile } from "../lib/userProfile";
import { recordStyle } from "../lib/aiMemory";
import { useToast } from "../components/Toast";
import { logActivity } from "../lib/activityLog";
import LearningStyleMini from "../components/Onboarding/LearningStyleMini";
import { Check, ChevronRight, BookOpen, ArrowRight } from "lucide-react";

const EXAMS = [
  { id: "jamb", title: "JAMB UTME", subtitle: "University entrance exam · 180 questions · 2hrs", icon: "🎯" },
  { id: "waec", title: "WAEC SSCE", subtitle: "West African senior certificate · May/June or Nov/Dec", icon: "📝" },
  { id: "nabteb", title: "NABTEB", subtitle: "National Business & Technical exams", icon: "🏫" },
  { id: "postutme", title: "POST-UTME", subtitle: "University screening after JAMB", icon: "📚" },
];

const SUBJECTS = {
  jamb: ["English", "Maths", "Physics", "Chemistry", "Biology", "Economics", "Government", "Literature", "CRS", "Geography", "Commerce", "Accounting"],
  waec: ["English", "Maths", "Physics", "Chemistry", "Biology", "Economics", "Government", "Literature", "CRS", "Geography", "Commerce", "Accounting", "Further Maths", "Agricultural Science", "Technical Drawing"],
  nabteb: ["English", "Maths", "Physics", "Chemistry", "Biology", "Economics", "Government", "Technical Drawing", "Business Management"],
  postutme: ["English", "Maths", "Physics", "Chemistry", "Biology", "Economics"],
};

const SUBJECT_ICONS = {
  English: "📖", Maths: "🔢", Physics: "⚛️", Chemistry: "🧪", Biology: "🧬",
  Economics: "💰", Government: "🏛️", Literature: "📚", CRS: "✝️", Geography: "🌍",
  Commerce: "📊", Accounting: "🧾", "Further Maths": "📐", "Agricultural Science": "🌾", "Technical Drawing": "📏",
  "Business Management": "💼",
};

export default function Onboarding() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    exam: null,
    subjects: [],
    targetScore: 280,
    targetGrade: "C",
  });
  const [learningStyle, setLearningStyle] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkAlreadyOnboarded() {
      if (!user) { setChecking(false); return; }
      try {
        const profile = await getUserProfile(user.uid);
        if (profile?.onboarded) {
          navigate("/dashboard", { replace: true });
          return;
        }
      } catch (e) {
        // No profile yet - fresh user, allow onboarding
        console.debug("No existing profile found:", e?.message);
      }
      setChecking(false);
    }
    checkAlreadyOnboarded();
  }, [user, navigate]);

  if (checking) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text)" }}>
        Loading...
      </div>
    );
  }

  const subjects = formData.exam ? SUBJECTS[formData.exam] : [];

  function handleExamSelect(exam) {
    setFormData({ ...formData, exam, subjects: [] });
  }

  function handleSubjectToggle(subject) {
    const current = formData.subjects;
    if (current.includes(subject)) {
      setFormData({ ...formData, subjects: current.filter(s => s !== subject) });
    } else {
      setFormData({ ...formData, subjects: [...current, subject] });
    }
  }

  function canProceedStep2() {
    return formData.subjects.length >= 3;
  }

  function getScoreColor(score) {
    if (score < 200) return "#FF4D6A";
    if (score < 250) return "#FF9F43";
    if (score < 320) return "var(--success)";
    return "var(--accent)";
  }

  function getScoreLabel(score) {
    if (score < 200) return "Keep pushing! You can do this 💪";
    if (score < 250) return "Good start! Let's aim higher 🔥";
    if (score < 320) return "That's a competitive score 🔥";
    return "Elite score! You're unstoppable 🚀";
  }

  async function handleComplete() {
    if (!user) return;
    setLoading(true);
    try {
      await createUserProfile(user.uid, {
        exam: formData.exam,
        subjects: formData.subjects,
        targetScore: formData.exam === "jamb" ? formData.targetScore : null,
        targetGrade: formData.exam !== "jamb" ? formData.targetGrade : null,
      });
      // Persist the learning-style answer (buffered; syncs when online)
      if (learningStyle) {
        recordStyle(user.uid, learningStyle).catch(() => {});
      }
      logActivity({ action: "onboarding_complete", userId: user.uid, email: user.email, details: { exam: formData.exam, subjects: formData.subjects, targetScore: formData.targetScore } });
      toast({ message: "Profile created! Let's go 🚀", type: "success" });
      navigate("/dashboard");
    } catch (error) {
      console.error("Error creating profile:", error);
      toast({ message: "Something went wrong. Try again.", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <style>{`
        .scrollbar-thin::-webkit-scrollbar { width: 6px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
      `}</style>

      <div style={{
        background: "var(--bg-2)",
        border: "1px solid var(--border)",
        borderRadius: 24,
        maxWidth: 520,
        width: "100%",
        padding: "40px 32px",
        position: "relative",
      }}>
        {/* Step indicator */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 32 }}>
          {[1, 2, 3, 4].map((s) => (
            <div key={s} style={{
              width: s === step ? 32 : 8,
              height: 8,
              borderRadius: 4,
              background: s <= step ? "var(--primary)" : "var(--border)",
              transition: "all 0.3s ease",
            }} />
          ))}
        </div>

        {/* Step 1: Choose Exam */}
        {step === 1 && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <h2 style={{ color: "var(--text)", fontSize: 24, fontWeight: 700, marginBottom: 8, textAlign: "center" }}>
              Choose Your Exam
            </h2>
            <p style={{ color: "var(--text-muted)", textAlign: "center", marginBottom: 24 }}>
              Select the exam you're preparing for
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {EXAMS.map((exam) => (
                <button
                  key={exam.id}
                  onClick={() => handleExamSelect(exam.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "16px 20px",
                    background: formData.exam === exam.id ? "var(--primary-dim)" : "var(--bg-3)",
                    border: formData.exam === exam.id ? "2px solid var(--accent)" : "1px solid var(--border)",
                    borderRadius: 16,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s ease",
                  }}
                >
                  <span style={{ fontSize: 24 }}>{exam.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "var(--text)", fontWeight: 600, fontSize: 15 }}>{exam.title}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 2 }}>{exam.subtitle}</div>
                  </div>
                  {formData.exam === exam.id && <Check size={20} color="var(--accent)" />}
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!formData.exam}
              style={{
                marginTop: 24,
                width: "100%",
                padding: "14px 24px",
                background: formData.exam ? "var(--primary)" : "var(--border)",
                color: formData.exam ? "#fff" : "var(--text-muted)",
                border: "none",
                borderRadius: 12,
                fontWeight: 600,
                fontSize: 15,
                cursor: formData.exam ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "all 0.2s ease",
              }}
            >
              Continue <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* Step 2: Pick Subjects */}
        {step === 2 && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <h2 style={{ color: "var(--text)", fontSize: 24, fontWeight: 700, marginBottom: 8, textAlign: "center" }}>
              Pick Your Subjects
            </h2>
            <p style={{ color: "var(--text-muted)", textAlign: "center", marginBottom: 24 }}>
              Select at least 3 subjects for {formData.exam?.toUpperCase()}
            </p>
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              maxHeight: 280,
              overflowY: "auto",
              paddingRight: 8,
              className: "scrollbar-thin",
            }}>
              {subjects.map((subject) => (
                <button
                  key={subject}
                  onClick={() => handleSubjectToggle(subject)}
                  style={{
                    padding: "10px 16px",
                    background: formData.subjects.includes(subject) ? "var(--primary)" : "var(--bg-3)",
                    border: formData.subjects.includes(subject) ? "1px solid var(--primary)" : "1px solid var(--border)",
                    borderRadius: 20,
                    color: formData.subjects.includes(subject) ? "#fff" : "var(--text-muted)",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.2s ease",
                  }}
                >
                  <span>{SUBJECT_ICONS[subject] || "📚"}</span>
                  {subject}
                  {formData.subjects.includes(subject) && <Check size={14} />}
                </button>
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: 16, color: formData.subjects.length >= 3 ? "var(--success)" : "var(--text-muted)", fontSize: 14 }}>
              {formData.subjects.length} selected
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  flex: 1,
                  padding: "14px 24px",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  color: "var(--text)",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!canProceedStep2()}
                style={{
                  flex: 1,
                  padding: "14px 24px",
                  background: canProceedStep2() ? "var(--primary)" : "var(--border)",
                  color: canProceedStep2() ? "#fff" : "var(--text-muted)",
                  border: "none",
                  borderRadius: 12,
                  fontWeight: 600,
                  cursor: canProceedStep2() ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                Continue <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Target Score */}
        {step === 3 && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <h2 style={{ color: "var(--text)", fontSize: 24, fontWeight: 700, marginBottom: 8, textAlign: "center" }}>
              Set Your Target
            </h2>
            <p style={{ color: "var(--text-muted)", textAlign: "center", marginBottom: 32 }}>
              {formData.exam === "jamb" ? "What's your target JAMB score?" : "What's your target grade?"}
            </p>

            {formData.exam === "jamb" ? (
              <div style={{ padding: "0 12px" }}>
                <div style={{
                  fontSize: 72,
                  fontWeight: 800,
                  textAlign: "center",
                  color: getScoreColor(formData.targetScore),
                  lineHeight: 1,
                  marginBottom: 8,
                }}>
                  {formData.targetScore}
                </div>
                <input
                  type="range"
                  min="150"
                  max="400"
                  value={formData.targetScore}
                  onChange={(e) => setFormData({ ...formData, targetScore: parseInt(e.target.value) })}
                  style={{
                    width: "100%",
                    height: 8,
                    borderRadius: 4,
                    appearance: "none",
                    background: `linear-gradient(to right, var(--danger) 0%, #FF9F43 33%, var(--success) 66%, var(--accent) 100%)`,
                    cursor: "pointer",
                    outline: "none",
                  }}
                />
                <p style={{
                  textAlign: "center",
                  marginTop: 16,
                  color: getScoreColor(formData.targetScore),
                  fontSize: 14,
                  fontWeight: 500,
                }}>
                  {getScoreLabel(formData.targetScore)}
                </p>
              </div>
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 12,
                padding: "0 12px",
              }}>
                {["A", "B", "C", "D", "E", "F"].map((grade) => (
                  <button
                    key={grade}
                    onClick={() => setFormData({ ...formData, targetGrade: grade })}
                    style={{
                      padding: "16px",
                      background: formData.targetGrade === grade ? "var(--primary-dim)" : "var(--bg-3)",
                      border: formData.targetGrade === grade ? "2px solid var(--primary)" : "1px solid var(--border)",
                      borderRadius: 12,
                      color: formData.targetGrade === grade ? "var(--text)" : "var(--text-muted)",
                      fontSize: 20,
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {grade}
                    <div style={{ fontSize: 10, fontWeight: 400, marginTop: 4, color: "var(--text-muted)" }}>
                      {grade === "A" ? "Excellent" : grade === "B" ? "Very Good" : grade === "C" ? "Good" : grade === "D" ? "Pass" : "Needs Work"}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
              <button
                onClick={() => setStep(2)}
                style={{
                  flex: 1,
                  padding: "14px 24px",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  color: "var(--text)",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                style={{
                  flex: 1,
                  padding: "14px 24px",
                  background: "var(--primary)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  cursor: "pointer",
                }}
              >
                Continue <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Learning style quiz */}
        {step === 4 && (
          <LearningStyleMini
            onDone={(style) => { setLearningStyle(style); setStep(5); }}
            onSkip={() => setStep(5)}
          />
        )}

        {/* Step 5: Welcome */}
        {step === 5 && (
          <div style={{ animation: "fadeIn 0.4s ease", textAlign: "center" }}>
            <div style={{
              width: 100,
              height: 100,
              margin: "0 auto 24px",
              background: "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
              borderRadius: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <BookOpen size={48} color="#fff" />
            </div>
            <h2 style={{ color: "var(--text)", fontSize: 28, fontWeight: 800, marginBottom: 12 }}>
              You're all set, {user?.displayName?.split(" ")[0] || "Student"} 🚀
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: 16, marginBottom: 8 }}>
              Your personalized study plan is ready.
            </p>
            <p style={{ color: "var(--primary)", fontSize: 18, fontWeight: 600, marginBottom: 32 }}>
              Let's crush that {formData.exam === "jamb" ? `${formData.targetScore} score` : `${formData.targetGrade} grade`}!
            </p>
            {learningStyle && (
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 24 }}>
                Your AI tutor will explain things {learningStyle === "visual" ? "with pictures & diagrams" : learningStyle === "verbal" ? "in clear words" : learningStyle === "example" ? "through worked examples" : "step by step"}.
                You can change this anytime in Settings.
              </p>
            )}
            <button
              onClick={handleComplete}
              disabled={loading}
              style={{
                padding: "16px 32px",
                background: "var(--landing-gradient-2)",
                color: "#fff",
                border: "none",
                borderRadius: 14,
                fontSize: 16,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                transition: "all 0.2s ease",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Setting up..." : "Enter Dashboard →"}
              <ArrowRight size={20} />
            </button>
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}