// Reference Library: searchable formula tables, constants, grammar rules.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { REFERENCE_SHEETS } from "../data/reference";
import { BOOK_RECS, BOOK_SUBJECTS } from "../data/resources";
import { LEARNING_RESOURCES, formatRSSDate, getCategoryIcon, VIDEO_LESSONS, VIDEO_SUBJECTS } from "../data/learningRSS";
import { Search, ArrowLeft, BookOpen, LibraryBig, Newspaper, ExternalLink, Clock, Tag, Video } from "lucide-react";

export default function ReferencePage() {
  const [tab, setTab] = useState("sheets");
  const [sheetId, setSheetId] = useState(REFERENCE_SHEETS[0].id);
  const [query, setQuery] = useState("");
  const [bookSubject, setBookSubject] = useState("All");
  const [bookQuery, setBookQuery] = useState("");
  const [feedCategory, setFeedCategory] = useState("All");
  const [feedQuery, setFeedQuery] = useState("");
  const [videoSubject, setVideoSubject] = useState("All");

  const books = BOOK_RECS.filter(
    (b) =>
      (bookSubject === "All" || b.subject === bookSubject) &&
      (!bookQuery.trim() ||
        `${b.title} ${b.note} ${b.where}`.toLowerCase().includes(bookQuery.trim().toLowerCase()))
  );

  const sheet = REFERENCE_SHEETS.find((s) => s.id === sheetId) || REFERENCE_SHEETS[0];

  const feedCategories = ["All", ...new Set(LEARNING_RESOURCES.map((r) => r.category))];
  const filteredFeed = useMemo(() => {
    const q = feedQuery.trim().toLowerCase();
    return LEARNING_RESOURCES.filter((r) => {
      if (feedCategory !== "All" && r.category !== feedCategory) return false;
      if (!q) return true;
      return `${r.title} ${r.description} ${r.category}`.toLowerCase().includes(q);
    }).sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }, [feedCategory, feedQuery]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sheet.groups;
    return sheet.groups
      .map((g) => ({
        ...g,
        rows: g.rows.filter(
          ([a, b]) => a.toLowerCase().includes(q) || b.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.rows.length > 0);
  }, [sheet, query]);

  return (
    <div className="page-content max-w-4xl mx-auto space-y-6">
      <Link to="/help" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: 14, fontWeight: 600 }}>
        <ArrowLeft size={16} /> Help
      </Link>
      <header>
        <h1 className="type-h1 flex items-center gap-2"><BookOpen size={26} className="text-primary" /> Reference Library</h1>
        <p className="lead">Formula sheets, constants, tables and grammar rules — searchable offline.</p>
      </header>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setTab("sheets")} className={tab === "sheets" ? "btn-primary" : "btn-secondary"} style={{ padding: "10px 18px", fontSize: 13 }}>
          <BookOpen size={15} /> Formula Sheets
        </button>
        <button onClick={() => setTab("books")} className={tab === "books" ? "btn-primary" : "btn-secondary"} style={{ padding: "10px 18px", fontSize: 13 }}>
          <LibraryBig size={15} /> Books & Tools
        </button>
        <button onClick={() => setTab("feed")} className={tab === "feed" ? "btn-primary" : "btn-secondary"} style={{ padding: "10px 18px", fontSize: 13 }}>
          <Newspaper size={15} /> Learning Feed
        </button>
        <button onClick={() => setTab("videos")} className={tab === "videos" ? "btn-primary" : "btn-secondary"} style={{ padding: "10px 18px", fontSize: 13 }}>
          <Video size={15} /> Video Lessons
        </button>
      </div>

      {tab === "videos" ? (
        <>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <select value={videoSubject} onChange={(e) => setVideoSubject(e.target.value)} className="input-field" style={{ maxWidth: 220 }}>
              {VIDEO_SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <p className="text-xs text-text-muted">{getVideosBySubject(videoSubject).length} lesson collection{getVideosBySubject(videoSubject).length === 1 ? "" : "s"}</p>
          </div>
          <div className="grid-auto">
            {getVideosBySubject(videoSubject).map((v, i) => (
              <a key={i} href={v.url} target="_blank" rel="noopener noreferrer" className="glass-card p-4" style={{ display: "block", textDecoration: "none" }}>
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--primary)" }}>{v.subject}</span>
                  <span className="text-[10px] text-text-muted inline-flex items-center gap-1"><Video size={10} /> {v.channel}</span>
                </div>
                <div className="font-bold text-text text-sm mb-1 flex items-center gap-1">{v.title} <ExternalLink size={11} /></div>
                <div className="text-sm text-text-muted" style={{ lineHeight: 1.55 }}>{v.desc}</div>
              </a>
            ))}
          </div>
          <p className="text-xs text-text-muted">Curated video collections from YouTube — tap any card to open the lessons. New content is added regularly.</p>
        </>
      ) : tab === "feed" ? (
        <>
          <div className="flex flex-col sm:flex-row gap-2">
            <select value={feedCategory} onChange={(e) => setFeedCategory(e.target.value)} className="input-field" style={{ maxWidth: 200 }}>
              {feedCategories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <div style={{ position: "relative", flex: 1 }}>
              <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input value={feedQuery} onChange={(e) => setFeedQuery(e.target.value)} placeholder="Search the learning feed…" className="input-field" style={{ paddingLeft: 40 }} />
            </div>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-text-muted">{filteredFeed.length} article{filteredFeed.length === 1 ? "" : "s"} · Updated regularly</p>
            <a href="/api/rss/learning" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold" style={{ color: "var(--primary)", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Newspaper size={12} /> Subscribe via RSS
            </a>
          </div>
          {filteredFeed.length === 0 && <p className="text-sm text-text-muted">No articles match your search.</p>}
          <div className="space-y-3">
            {filteredFeed.map((r) => (
              <div key={r.id} className="glass-card p-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl shrink-0">{getCategoryIcon(r.category)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--primary)" }}>{r.category}</span>
                      <span className="text-[10px] text-text-muted inline-flex items-center gap-1"><Clock size={10} /> {formatRSSDate(r.publishedAt)}</span>
                    </div>
                    <a href={r.url} target={r.url.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="font-bold text-text text-sm hover:text-primary transition-colors" style={{ display: "block", marginBottom: 4 }}>
                      {r.title} {r.url.startsWith("http") && <ExternalLink size={12} style={{ display: "inline", marginLeft: 4 }} />}
                    </a>
                    <p className="text-sm text-text-muted" style={{ lineHeight: 1.6, margin: 0 }}>{r.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: "var(--bg-3)", color: "var(--text-muted)", border: "1px solid var(--border)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <Tag size={9} /> {r.source}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-text-muted">Fresh JAMB, WAEC, NECO & IELTS news and study tips. Subscribe to the RSS feed in any reader to never miss an update.</p>
        </>
      ) : tab === "books" ? (
        <>
          <div className="flex flex-col sm:flex-row gap-2">
            <select value={bookSubject} onChange={(e) => setBookSubject(e.target.value)} className="input-field" style={{ maxWidth: 220 }}>
              {BOOK_SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <div style={{ position: "relative", flex: 1 }}>
              <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input value={bookQuery} onChange={(e) => setBookQuery(e.target.value)} placeholder="Search books & tools…" className="input-field" style={{ paddingLeft: 40 }} />
            </div>
          </div>
          {books.length === 0 && <p className="text-sm text-text-muted">No matches.</p>}
          <div className="grid-auto">
            {books.map((b, i) => (
              <div key={i} className="glass-card p-4">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--primary)" }}>{b.subject}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: "var(--bg-3)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>{b.type}</span>
                </div>
                <div className="font-bold text-text text-sm mb-1">{b.title}</div>
                <div className="text-sm text-text-muted mb-2" style={{ lineHeight: 1.55 }}>{b.note}</div>
                <div className="text-xs text-text-muted">📍 {b.where}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-text-muted">We list titles and where to get them legally — never pirated PDFs. In-app tools open right inside ExamPadi.</p>
        </>
      ) : (
      <>
      <div className="flex gap-2 flex-wrap">
        {REFERENCE_SHEETS.map((s) => (
          <button
            key={s.id}
            onClick={() => { setSheetId(s.id); setQuery(""); }}
            className={sheetId === s.id ? "btn-primary" : "btn-secondary"}
            style={{ padding: "10px 18px", fontSize: 13 }}
          >
            {s.emoji} {s.title}
          </button>
        ))}
      </div>

      <div style={{ position: "relative" }}>
        <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${sheet.title.toLowerCase()}… e.g. "quadratic" or "pH"`}
          className="input-field"
          style={{ paddingLeft: 40 }}
        />
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-text-muted">No matches — try a different word.</p>
      )}

      {filtered.map((g) => (
        <div key={g.name} className="glass-card p-5">
          <h2 className="font-black text-text mb-3">{g.name}</h2>
          <div className="table-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <tbody>
                {g.rows.map(([a, b], i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 700, color: "var(--primary)", verticalAlign: "top", whiteSpace: "nowrap" }}>{a}</td>
                    <td style={{ padding: "10px 12px", color: "var(--text)", lineHeight: 1.6 }}>{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      </>
      )}
    </div>
  );
}
