// Parent reports: per-student one-pagers → combined PDF + WhatsApp share.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import { getUserProfile } from "../../lib/userProfile";
import { listSchoolClasses, getClass, getTeacherNote } from "../../lib/schools";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { ArrowLeft, Download, Share2, Loader2 } from "lucide-react";

export default function ParentReports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid).then(async (p) => {
      if (!p?.schoolId) { setLoading(false); return; }
      const cs = await listSchoolClasses(p.schoolId).catch(() => []);
      setClasses(cs);
      if (cs.length > 0) setClassId(cs[0].id);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  async function loadReports(cid) {
    setLoading(true);
    try {
      const cls = await getClass(cid);
      const rows = [];
      for (const uid of (cls?.students || []).slice(0, 60)) {
        const [prof, sesSnap, note] = await Promise.all([
          getUserProfile(uid).catch(() => null),
          getDocs(query(collection(db, "sessions"), where("userId", "==", uid), limit(20))).catch(() => ({ docs: [] })),
          getTeacherNote(cid, uid).catch(() => null),
        ]);
        let correct = 0, total = 0, hours = 0;
        const topicAgg = {};
        sesSnap.docs.forEach((d) => {
          const data = d.data();
          total += data.total || 0;
          correct += data.correct || 0;
          hours += (data.timeSeconds || 0) / 3600;
          (data.questionLog || []).forEach((l) => {
            const key = l.t || "General";
            topicAgg[key] = topicAgg[key] || { c: 0, t: 0 };
            topicAgg[key].t += 1;
            if (l.ok) topicAgg[key].c += 1;
          });
        });
        const topics = Object.entries(topicAgg)
          .map(([t, v]) => ({ topic: t, acc: v.t ? Math.round((v.c / v.t) * 100) : null }))
          .filter((x) => x.acc !== null)
          .sort((a, b) => b.acc - a.acc);
        rows.push({
          uid,
          name: prof?.name || "Student",
          accuracy: total > 0 ? Math.round((correct / total) * 100) : null,
          hours: Math.round(hours * 10) / 10,
          answered: total,
          strongest: topics[0] || null,
          weakest: topics.length > 0 ? topics[topics.length - 1] : null,
          note: note?.note || "",
        });
      }
      setReports(rows);
    } catch (e) {
      toast({ message: `Failed: ${e.message}`, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loadReports async-toggles the loading flag for the fetch
    if (classId) loadReports(classId);
  }, [classId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function buildPdf() {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF();
    const W = pdf.internal.pageSize.getWidth();
    reports.forEach((r, i) => {
      if (i > 0) pdf.addPage();
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.text("Weekly Progress Report", W / 2, 20, { align: "center" });
      pdf.setFontSize(12);
      pdf.text(r.name, W / 2, 30, { align: "center" });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      const lines = [
        `Practice hours this period: ${r.hours}h`,
        `Questions answered: ${r.answered}`,
        `Accuracy: ${r.accuracy === null ? "no data yet" : `${r.accuracy}%`}`,
        `Strongest topic: ${r.strongest ? `${r.strongest.topic} (${r.strongest.acc}%)` : "–"}`,
        `Needs work: ${r.weakest ? `${r.weakest.topic} (${r.weakest.acc}%)` : "–"}`,
        `Teacher note: ${r.note || "Keep up the steady practice."}`,
      ];
      lines.forEach((ln, j) => pdf.text(ln, 20, 48 + j * 10));
      pdf.setFontSize(9);
      pdf.text(`ExamPadi · ${new Date().toLocaleDateString()}`, W / 2, pdf.internal.pageSize.getHeight() - 12, { align: "center" });
    });
    return pdf;
  }

  async function handleDownload() {
    if (reports.length === 0) return;
    setBusy(true);
    try {
      const pdf = await buildPdf();
      pdf.save(`parent-reports-${Date.now()}.pdf`);
      toast({ message: "Reports downloaded ✓", type: "success" });
    } catch (e) {
      toast({ message: `PDF failed: ${e.message}`, type: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function handleShare() {
    try {
      const pdf = await buildPdf();
      const file = new File([pdf.output("blob")], "parent-reports.pdf", { type: "application/pdf" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Parent reports" });
      } else {
        toast({ message: "Sharing not supported — download instead", type: "info" });
      }
    } catch (e) {
      toast({ message: `Share failed: ${e.message}`, type: "error" });
    }
  }

  return (
    <div className="page-content max-w-4xl mx-auto space-y-6">
      <Link to="/teacher" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: 14, fontWeight: 600 }}>
        <ArrowLeft size={16} /> Back to dashboard
      </Link>
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <h1 className="text-2xl font-black text-text">Parent Reports</h1>
        <div className="flex gap-2 flex-wrap">
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className="input-field" style={{ maxWidth: 220 }}>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.subject}</option>)}
          </select>
          <button onClick={handleDownload} disabled={busy || reports.length === 0} className="btn-primary px-4 disabled:opacity-60">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} PDF
          </button>
          <button onClick={handleShare} className="btn-secondary px-4"><Share2 size={15} /> WhatsApp</button>
        </div>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading reports…</p>
      ) : reports.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>No students in this class yet.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {reports.map((r) => (
            <div key={r.uid} className="glass-card p-5 space-y-2">
              <div className="font-black text-text">{r.name}</div>
              <div className="text-sm text-text-muted">⏱ {r.hours}h · ✏️ {r.answered} Qs · 🎯 {r.accuracy === null ? "–" : `${r.accuracy}%`}</div>
              <div className="text-sm">💪 <strong>{r.strongest ? `${r.strongest.topic} (${r.strongest.acc}%)` : "–"}</strong></div>
              <div className="text-sm">🎯 Needs work: <strong>{r.weakest ? `${r.weakest.topic} (${r.weakest.acc}%)` : "–"}</strong></div>
              {r.note && <div className="text-sm italic text-text-muted">“{r.note}”</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
