import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserProfile } from "../lib/userProfile";
import { getFilteredQuestions, getTopics, getAllSubjects, getTotalCount } from "../data/questions/compat";
import { getEnabledExams } from "../lib/exams";
import RepetitionBadge from "../components/QuestionBank/RepetitionBadge";
import { ChevronRight, ChevronLeft, Search, BookOpen, Download, FileSpreadsheet } from "lucide-react";
import { exportQuestionBankCSV, exportQuestionSummaryCSV } from "../lib/questionExport";
import { useToast } from "../components/Toast";

const DIFFICULTY_COLORS = { easy: "#4ADE80", medium: "#FF9F43", hard: "#FF4D6A" };

export default function QuestionBank() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [page, setPage] = useState(1);
  const perPage = 20;

  const [filters, setFilters] = useState({
    subject: "All Subjects",
    topic: "",
    exam: "ALL",
    difficulty: "ALL",
    yearFrom: "2017",
    yearTo: "2026",
    highYieldOnly: false,
  });

  useEffect(() => {
    if (user) getUserProfile(user.uid).then(setProfile).catch(e => { console.warn("Failed to load profile:", e); });
  }, [user]);

  const userSubjects = profile?.subjects || [];
  const enabledExams = getEnabledExams(profile).filter((e) => ["JAMB", "WAEC", "NECO", "NABTEB"].includes(e));
  const examOptions = ["ALL", ...enabledExams];
  const allSubjects = getAllSubjects();
  const subjectOptions = ["All Subjects", ...allSubjects.filter(s => userSubjects.includes(s) || !userSubjects.length)];

  const topics = filters.subject && filters.subject !== "All Subjects" ? getTopics(filters.subject) : [];

  const filtered = getFilteredQuestions(filters);
  const totalPages = Math.ceil(filtered.length / perPage);  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  function updateFilter(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  }

  // If the chosen exam was switched off in Settings, fall back to ALL
  useEffect(() => {
    if (profile && filters.exam !== "ALL") {
      const allowed = getEnabledExams(profile);
      if (!allowed.includes(filters.exam)) {
        setFilters(prev => ({ ...prev, exam: "ALL" }));
      }
    }
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleStartPractice() {
    const qs = filtered.slice(0, 20);
    navigate("/practice", { state: { questions: qs, subject: filters.subject === "All Subjects" ? "Mixed" : filters.subject, mode: "practice" } });
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "'Inter', system-ui, sans-serif", color: "var(--text)" }}>
      <div className="page-content" style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ marginBottom: 8 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Question Bank</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "4px 0 0" }}>Browse {getTotalCount()} past questions across all subjects</p>
        </div>

        {/* Filter bar */}
        <div style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)", padding: 16, position: "sticky", top: 0, zIndex: 10, marginBottom: 20, borderRadius: 12, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <select value={filters.subject} onChange={e => updateFilter("subject", e.target.value)} style={{ background: "var(--bg-3)", border: "1px solid #333", borderRadius: 8, color: "#fff", padding: "8px 12px", fontSize: 13, outline: "none", fontFamily: "inherit" }}>
            {subjectOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {topics.length > 0 && (
            <select value={filters.topic} onChange={e => updateFilter("topic", e.target.value)} style={{ background: "var(--bg-3)", border: "1px solid #333", borderRadius: 8, color: "#fff", padding: "8px 12px", fontSize: 13, outline: "none", fontFamily: "inherit" }}>
              <option value="">All Topics</option>
              {topics.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}

          {examOptions.map(e => (
            <button key={e} onClick={() => updateFilter("exam", e)} style={{ padding: "6px 14px", borderRadius: 20, border: filters.exam === e ? "1px solid var(--primary)" : "1px solid #333", background: filters.exam === e ? "rgb(var(--primary-rgb) / 0.2)" : "transparent", color: filters.exam === e ? "#fff" : "var(--text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              {e === "ALL" ? "ALL" : e}
            </button>
          ))}

          {["ALL", "Easy", "Medium", "Hard"].map(d => (
            <button key={d} onClick={() => updateFilter("difficulty", d)} style={{ padding: "6px 14px", borderRadius: 20, border: filters.difficulty === d ? "1px solid var(--primary)" : "1px solid #333", background: filters.difficulty === d ? "rgb(var(--primary-rgb) / 0.2)" : "transparent", color: filters.difficulty === d ? "#fff" : "var(--text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              {d}
            </button>
          ))}

          <input type="number" placeholder="From" value={filters.yearFrom} onChange={e => updateFilter("yearFrom", e.target.value)} style={{ width: 64, background: "var(--bg-3)", border: "1px solid #333", borderRadius: 8, color: "#fff", padding: "8px 10px", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
          <input type="number" placeholder="To" value={filters.yearTo} onChange={e => updateFilter("yearTo", e.target.value)} style={{ width: 64, background: "var(--bg-3)", border: "1px solid #333", borderRadius: 8, color: "#fff", padding: "8px 10px", fontSize: 13, outline: "none", fontFamily: "inherit" }} />

          <button onClick={() => updateFilter("highYieldOnly", !filters.highYieldOnly)} style={{ padding: "6px 14px", borderRadius: 20, border: filters.highYieldOnly ? "1px solid #f97316" : "1px solid #333", background: filters.highYieldOnly ? "rgba(249,115,22,0.15)" : "transparent", color: filters.highYieldOnly ? "#f97316" : "var(--text-muted)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            🔥 High-yield only
          </button>

          <button
            onClick={() => {
              const n = exportQuestionBankCSV(filters);
              toast({ message: `Exported ${n} questions to CSV ✓`, type: "success" });
            }}
            title="Download the filtered bank as a spreadsheet (CSV)"
            style={{ padding: "8px 14px", borderRadius: 20, border: "1px solid var(--success)", background: "rgba(74,222,128,0.1)", color: "var(--success)", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit" }}
          >
            <FileSpreadsheet size={13} /> CSV
          </button>
          <button
            onClick={() => {
              const n = exportQuestionSummaryCSV();
              toast({ message: `Exported ${n} subject summary rows ✓`, type: "success" });
            }}
            title="Download a subject × count summary spreadsheet"
            style={{ padding: "8px 14px", borderRadius: 20, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit" }}
          >
            <Download size={13} /> Summary
          </button>

          <button onClick={handleStartPractice} style={{ marginLeft: "auto", padding: "10px 20px", borderRadius: 10, border: "none", background: "var(--primary)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
            Practice {filtered.length > 20 ? "20" : filtered.length} Questions <ChevronRight size={16} />
          </button>
        </div>

        {/* Question list */}
        {paged.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
            <BookOpen size={48} style={{ opacity: 0.3, margin: "0 auto 16px", display: "block" }} />
            <h3 style={{ color: "#fff", fontWeight: 700, marginBottom: 8 }}>No questions found</h3>
            <p style={{ fontSize: 14 }}>Try adjusting your filters</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {paged.map(q => {
              const isExpanded = expandedId === q.id;
              return (
                <div key={q.id} className={`fold-card fold${isExpanded ? " fold-open" : ""}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => setExpandedId(isExpanded ? null : q.id)}>
                  <div className="fold-header" style={{ alignItems: "flex-start", padding: 16 }} role="button" tabIndex={0}
                    aria-expanded={isExpanded}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpandedId(isExpanded ? null : q.id); } }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: DIFFICULTY_COLORS[q.difficulty], marginTop: 6, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 6, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: isExpanded ? "unset" : 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{q.question}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ padding: "2px 8px", borderRadius: 10, background: "rgb(var(--primary-rgb) / 0.15)", color: "var(--primary)", fontSize: 11, fontWeight: 600 }}>{q.topic}</span>
                        <span style={{ padding: "2px 8px", borderRadius: 10, background: "rgb(var(--bg-3-rgb) / 0.8)", color: "var(--text-muted)", fontSize: 11, fontWeight: 500 }}>{q.year}</span>
                        {q.exam.map(e => <span key={e} style={{ padding: "2px 8px", borderRadius: 10, background: "rgb(var(--success-rgb) / 0.12)", color: "var(--success)", fontSize: 11, fontWeight: 600 }}>{e}</span>)}
                        <RepetitionBadge question={q} />
                      </div>
                    </div>
                    <ChevronRight size={18} className="fold-chevron fold-chevron-side" color="var(--text-muted)" />
                  </div>

                  <div className="fold-body">
                    <div>
                      <div style={{ margin: "0 16px 16px", paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                        <div style={{ display: "grid", gap: 8 }}>
                          {Object.entries(q.options).map(([key, val]) => (
                            <div key={key} style={{ padding: "10px 14px", borderRadius: 8, border: key === q.answer ? "1.5px solid var(--success)" : "1px solid var(--border)", background: key === q.answer ? "rgb(var(--success-rgb) / 0.1)" : "var(--bg-3)", display: "flex", gap: 10, alignItems: "center" }}>
                              <span style={{ width: 24, height: 24, borderRadius: 6, background: key === q.answer ? "var(--success)" : "var(--bg-3)", color: key === q.answer ? "#fff" : "var(--text)", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: key === q.answer ? "none" : "1px solid var(--border)" }}>{key}</span>
                              <span style={{ fontSize: 13, color: key === q.answer ? "var(--success)" : "var(--text)" }}>{val}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: "rgb(var(--primary-rgb) / 0.1)", borderLeft: "3px solid var(--primary)" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", marginBottom: 6 }}>Explanation</div>
                          <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5, margin: 0 }}>{q.explanation}</p>
                          {q.hint && <p style={{ fontSize: 12, color: "var(--accent)", marginTop: 8, fontStyle: "italic" }}>💡 {q.hint}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 24, alignItems: "center" }}>
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ padding: "8px 16px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid #333", color: page <= 1 ? "var(--text-muted)" : "#fff", cursor: page <= 1 ? "not-allowed" : "pointer" }}><ChevronLeft size={16} /></button>
            <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: "8px 16px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid #333", color: page >= totalPages ? "var(--text-muted)" : "#fff", cursor: page >= totalPages ? "not-allowed" : "pointer" }}><ChevronRight size={16} /></button>
          </div>
        )}
      </div>
    </div>
  );
}