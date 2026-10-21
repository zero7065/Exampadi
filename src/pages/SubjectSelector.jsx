// src/pages/SubjectSelector.jsx
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "../components/Toast";
import { useAuth } from "../context/AuthContext";
import { getUserProfile } from "../lib/userProfile";
import { getEnabledExams } from "../lib/exams";
import { JAMB_SUBJECTS, WAEC_SUBJECTS } from "../data/subjects";
import { getQuestionsFromBank, NABTEB_SUBJECTS } from "../data/questions/compat";
import { 
  Search, 
  ChevronRight, 
  Zap, 
  BookOpen, 
  ShieldCheck, 
  History, 
  Loader2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

const SubjectSelector = () => {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") || "practice";
  
  const [exam, setExam] = useState("JAMB");
  const [mode, setMode] = useState(initialMode);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [enabledExams, setEnabledExams] = useState(["JAMB", "WAEC", "NABTEB"]);

  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid).then((p) => {
      const list = getEnabledExams(p).filter((e) => ["JAMB", "WAEC", "NABTEB"].includes(e));
      if (list.length > 0) {
        setEnabledExams(list);
        setExam((prev) => (list.includes(prev) ? prev : list[0]));
      }
    }).catch(() => {});
  }, [user]);

  const subjects = exam === "JAMB" ? JAMB_SUBJECTS : exam === "WAEC" ? WAEC_SUBJECTS : NABTEB_SUBJECTS;
  const filteredSubjects = subjects.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSubject = (id) => {
    if (selectedSubjects.includes(id)) {
      setSelectedSubjects(selectedSubjects.filter(s => s !== id));
    } else {
      if (mode === "cbt" && selectedSubjects.length >= 4) {
        return;
      }
      setSelectedSubjects([...selectedSubjects, id]);
    }
  };

  const handleStart = () => {
    if (selectedSubjects.length === 0) {
      toast({ message: "Please select at least one subject", type: "warning" });
      return;
    }

    setLoading(true);
    try {
      const subjectObjects = selectedSubjects.map(id => subjects.find(s => s.id === id));
      const questionCount = mode === "cbt" ? 40 : 20;
      const questionsPerSubject = Math.ceil(questionCount / subjectObjects.length);
      const allQuestions = [];
      subjectObjects.forEach(s => {
        const qs = getQuestionsFromBank({
          subject: s.name,
          exam: exam,
          count: questionsPerSubject
        });
        allQuestions.push(...qs);
      });
      const questions = allQuestions.sort(() => Math.random() - 0.5).slice(0, questionCount);

      toast({ message: "Questions generated! Let's go 🔥", type: "success" });
      navigate(mode === "cbt" ? "/cbt" : "/practice", {
        state: {
          exam,
          mode,
          questions,
          subject: subjectObjects.map(s => s.name).join(", "),
          subjects: subjectObjects,
          startTime: Date.now(),
        }
      });
    } catch (error) {
      toast({ message: error.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-10 animate-fade">
      <header className="space-y-4">
        <h1 className="text-4xl font-black text-text tracking-tight">Prepare Your Session</h1>
        <p className="text-text-muted font-medium">Select your exam type, mode, and subjects to begin.</p>
      </header>

      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          {/* Exam & Mode Selection */}
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Exam Board</label>
              <div className="flex bg-bg-3 p-1.5 rounded-2xl border border-border">
                {enabledExams.map(e => (
                  <button 
                    key={e} 
                    onClick={() => { setExam(e); setSelectedSubjects([]); }}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${exam === e ? "bg-primary" : "text-text-muted"}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Study Mode</label>
              <div className="flex bg-bg-3 p-1.5 rounded-2xl border border-border">
                {[
                  { id: "practice", label: "Practice", icon: <BookOpen size={16} /> },
                  { id: "cbt", label: "Exam Mode", icon: <Zap size={16} /> }
                ].map(m => (
                  <button 
                    key={m.id} 
                    onClick={() => setMode(m.id)}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${mode === m.id ? "bg-accent shadow-lg shadow-accent/20" : "text-text-muted"}`}
                  >
                    {m.icon}
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Subject Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
            <input 
              type="text"
              placeholder={`Search ${exam} subjects...`}
              className="input-field pl-12 h-16 text-lg font-bold"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Subjects Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {filteredSubjects.map((s) => {
              const isSelected = selectedSubjects.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggleSubject(s.id)}
                  className={`p-6 rounded-2xl border-2 transition-all text-left group relative overflow-hidden ${
                    isSelected 
                    ? "border-primary bg-primary-dim shadow-xl shadow-primary/10" 
                    : "border-border bg-bg-2 hover:border-text-muted"
                  }`}
                >
                  <div className={`text-3xl mb-4 group-hover:scale-110 transition-transform duration-300 ${isSelected ? 'animate-bounce' : ''}`}>
                    {s.icon}
                  </div>
                  <div className="font-black text-sm leading-tight text-text">{s.name}</div>
                  {isSelected && (
                    <div className="absolute top-4 right-4 text-primary">
                      <CheckCircle2 size={20} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar Summary */}
        <div className="space-y-8">
          <div className="glass-card p-8 sticky top-10 space-y-8">
            <h3 className="text-xl font-black text-text">Session Summary</h3>
            
            <div className="space-y-4">
              <SummaryItem label="Exam" value={exam} color="text-primary" />
              <SummaryItem label="Mode" value={mode === "cbt" ? "Exam Mode" : "Focused Practice"} color="text-accent" />
              <SummaryItem label="Subjects" value={selectedSubjects.length} color="text-text" />
            </div>

            <div className="h-px bg-border"></div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-muted block">Selection</label>
              <div className="flex flex-wrap gap-2">
                {selectedSubjects.map(id => {
                  const s = subjects.find(sub => sub.id === id);
                  return (
                    <span key={id} className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full text-xs font-bold">
                      {s.name}
                    </span>
                  );
                })}
                {selectedSubjects.length === 0 && <span className="text-text-muted text-xs italic">No subjects selected yet...</span>}
              </div>
            </div>

            <button 
              onClick={handleStart}
              disabled={loading || selectedSubjects.length === 0}
              className="btn-primary w-full h-16 text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
            >
              {loading ? <Loader2 className="animate-spin" size={24} /> : (
                <>
                  Start Session
                  <ChevronRight size={20} />
                </>
              )}
            </button>

            <div className="flex items-center gap-3 p-4 bg-primary-dim rounded-2xl border border-primary/10">
              <ShieldCheck className="text-primary shrink-0" size={20} />
              <p className="text-[10px] font-bold text-text-muted leading-relaxed">
                We'll generate {mode === 'cbt' ? '40' : '20'} questions using your selected subjects.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SummaryItem = ({ label, value, color }) => (
  <div className="flex justify-between items-center">
    <span className="text-xs font-black uppercase tracking-widest text-text-muted">{label}</span>
    <span className={`font-black ${color}`}>{value}</span>
  </div>
);

export default SubjectSelector;
