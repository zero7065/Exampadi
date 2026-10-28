// src/pages/schools/SchoolStatusPage.jsx — Simple dashboard for school management live data
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import {
  Users, Building2, Key, ClipboardList, Eye, EyeOff, Settings2,
} from "lucide-react";
import {
  listSchoolClasses, listSchoolTeachers, getClass,
} from "../../lib/schools";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebaseConfig";

export default function SchoolStatusPage() {
  const { user } = useAuth();
  const [schoolId, setSchoolId] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showClassModal, setShowClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassSubject, setNewClassSubject] = useState("");

  useEffect(() => {
    if (!user?.uid) return;
    // Get schoolId from user profile
    const userDocRef = doc(db, "users", user.uid);
    const getSchoolId = async () => {
      const snap = await getDoc(userDocRef);
      const data = snap.exists() ? snap.data() : {};
      setSchoolId(data.schoolId || "");
      setSchoolName(data.schoolName || user?.email?.split("@")[0] || "School");
    };
    getSchoolId();
  }, [user]);

  useEffect(() => {
    if (!schoolId) return;
    Promise.all([
      listSchoolClasses(schoolId),
      listSchoolTeachers(schoolId),
    ]).then(([cs, ts]) => {
      setClasses(cs);
      setTeachers(ts);
      // Count students across all classes
      let totalStudents = 0;
      cs.forEach(c => {
        const studCount = (c.students || []).length;
        totalStudents += studCount;
      });
      setStudents(totalStudents);
      setLoading(false);
    }).catch((e) => {
      toast({ message: `Failed to load data: ${e.message}`, type: "error" });
      setLoading(false);
    });
  }, [schoolId]);

  async function handleCreateClass() {
    if (!newClassName.trim() || !newClassSubject.trim()) return;
    try {
      const id = await createClass(schoolId, {
        name: newClassName.trim(),
        subject: newClassSubject.trim(),
        createdBy: user?.uid || "",
        teacherId: user?.uid || "",
      });
      toast({ message: "Class created ✓", type: "success" });
      setNewClassName("");
      setNewClassSubject("");
      setShowClassModal(false);
      const cs = await listSchoolClasses(schoolId);
      setClasses(cs);
    } catch (e) {
      toast({ message: `Failed: ${e.message}`, type: "error" });
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "'Inter', system-ui, sans-serif", color: "var(--text)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 32 }}>
        <header style={{ marginBottom: 32 }}>
          <h1 className="text-3xl font-black text-text">School Management Dashboard</h1>
          <p className="text-text-muted">Live overview of your school's ExamPadi account</p>
        </header>

        {loading ? (
          <div style={{ textAlign: "center", padding: 64, color: "var(--text-muted)" }}>Loading school data…</div>
        ) : null}

        <div className="grid md:grid-cols-2 gap-6">
          {/* School Overview */}
          <div className="glass-card p-6 rounded-2xl">
            <h2 className="text-xl font-black text-text mb-4">School Overview</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-black text-primary">{classes.length}</p>
                <p className="text-text-muted">Classes</p>
              </div>
              <div>
                <p className="text-2xl font-black text-primary">{teachers.length}</p>
                <p className="text-text-muted">Teachers</p>
              </div>
              <div>
                <p className="text-2xl font-black text-primary">{students}</p>
                <p className="text-text-muted">Students</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass-card p-6 rounded-2xl">
            <h2 className="text-xl font-black text-text mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button onClick={() => setShowClassModal(true)} className="w-full px-6 py-3 rounded-xl border border-primary text-primary hover:bg-primary/10 transition-colors">
                <Plus size={16} /> Create New Class
              </button>
              <button className="w-full px-6 py-3 rounded-xl border border-text-muted text-text-muted hover:bg-bg-3 transition-colors">
                <Users size={16} /> View All Teachers
              </button>
              <button className="w-full px-6 py-3 rounded-xl border border-text-muted text-text-muted hover:bg-bg-3 transition-colors">
                <Key size={16} /> Generate Teacher Code
              </button>
            </div>
          </div>
        </div>

        {/* Classes Section */}
        {classes.length > 0 && (
          <section className="mt-8">
            <h2 className="text-2xl font-black text-text mb-4">Classes</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr style={{ color: "var(--text-muted)", fontWeight: 700 }}>
                    <th style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>Class</th>
                    <th style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>Subject</th>
                    <th style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((c) => (
                    <tr key={c.id} style={{ borderBottom: "1px solid var(--bg-3)" }}>
                      <td style={{ padding: "8px 12px", color: "var(--text)", fontWeight: 500 }}>{c.name}</td>
                      <td style={{ padding: "8px 12px", color: "var(--text-muted)", fontSize: 12 }}>{c.subject}</td>
                      <td style={{ padding: "8px 12px", color: "var(--text-muted)", fontSize: 12 }}>
                        <button className="text-primary hover:underline text-sm">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Teachers Section */}
        {teachers.length > 0 && (
          <section className="mt-8">
            <h2 className="text-2xl font-black text-text mb-4">Teachers</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr style={{ color: "var(--text-muted)", fontWeight: 700 }}>
                    <th style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>Name</th>
                    <th style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>Email</th>
                    <th style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((t) => (
                    <tr key={t.uid} style={{ borderBottom: "1px solid var(--bg-3)" }}>
                      <td style={{ padding: "8px 12px", color: "var(--text)", fontWeight: 500 }}>{t.name}</td>
                      <td style={{ padding: "8px 12px", color: "var(--text-muted)", fontSize: 12 }}>{t.email}</td>
                      <td style={{ padding: "8px 12px", color: "var(--text-muted)", fontSize: 12 }}>
                        <button className="text-primary hover:underline text-sm">Manage</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Students Summary */}
        <section className="mt-8">
          <h2 className="text-2xl font-black text-text mb-4">Student Summary</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card p-6 rounded-2xl text-center">
              <p className="text-3xl font-black text-primary">{students}</p>
              <p className="text-text-muted">Total Students</p>
            </div>
            <div className="glass-card p-6 rounded-2xl text-center">
              <p className="text-3xl font-black text-primary">{classes.length}</p>
              <p className="text-text-muted">Active Classes</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}