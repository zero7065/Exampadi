// Admin compliance tab: audit counts, audit CSV, school approvals, role editor, partner payouts.
import React, { useEffect, useMemo, useState } from "react";
import { collection, query, where, getDocs, limit, doc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { listSchools, setSchoolStatus } from "../lib/schools";
import { Check, X, Download } from "lucide-react";

export default function AdminCompliance({ adminUser, usersList, logs, showToast }) {
  const [pending, setPending] = useState([]);
  const [teacherEmail, setTeacherEmail] = useState({});
  const [loading, setLoading] = useState(true);
  const [commissions, setCommissions] = useState([]);
  const [payingRef, setPayingRef] = useState(null);

  useEffect(() => {
    listSchools("pending").then(setPending).catch(() => setPending([])).finally(() => setLoading(false));
    // Partner commissions awaiting payout
    getDocs(query(collection(db, "commissions"), where("status", "==", "pending"), limit(50)))
      .then((snap) => setCommissions(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(() => setCommissions([]));
  }, []);

  async function markCommissionPaid(c) {
    if (!db || payingRef) return;
    setPayingRef(c.id);
    try {
      await updateDoc(doc(db, "commissions", c.id), {
        status: "paid",
        paidAt: serverTimestamp(),
        paidBy: adminUser?.uid || null,
      });
      await updateDoc(doc(db, "schools", c.schoolId), {
        "partner.pendingPayout": increment(-Number(c.commissionNaira || 0)),
        "partner.totalPaid": increment(Number(c.commissionNaira || 0)),
      });
      setCommissions((list) => list.map((x) => x.id === c.id ? { ...x, status: "paid" } : x));
      showToast(`Marked ₦${Number(c.commissionNaira || 0).toLocaleString()} paid ✓`, "success");
    } catch (e) {
      showToast(`Failed: ${e.message}`, "error");
    } finally {
      setPayingRef(null);
    }
  }

  const nowRef = React.useRef(Date.now());
  const counts = useMemo(() => {
    const now = nowRef.current;
    const active30d = usersList.filter((u) => {
      const last = u.lastActive?.toDate ? u.lastActive.toDate().getTime()
        : u.lastActive ? new Date(u.lastActive).getTime() : 0;
      return now - last < 30 * 24 * 60 * 60 * 1000;
    }).length;
    return {
      active30d,
      deleted: usersList.filter((u) => u.deletedAt).length,
      adminReads: logs.filter((l) => l.action === "admin_user_read").length,
    };
  }, [usersList, logs]);

  function exportCsv() {
    const rows = [
      ["metric", "value"],
      ["total_users", usersList.length],
      ["active_30d", counts.active30d],
      ["deleted_accounts", counts.deleted],
      ["admin_user_reads", counts.adminReads],
      ["pending_schools", pending.length],
      ["exported_at", new Date().toISOString()],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `exampadi-compliance-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  async function findUidByEmail(email) {
    const snap = await getDocs(query(collection(db, "users"), where("email", "==", email.trim()), limit(1)));
    return snap.empty ? null : snap.docs[0].id;
  }

  async function decide(school, approve) {
    try {
      let teacherUid = null;
      if (approve) {
        const email = (teacherEmail[school.id] || "").trim();
        if (email) {
          teacherUid = await findUidByEmail(email);
          if (!teacherUid) {
            showToast(`No user found with email ${email} — school approved without teacher`, "warning");
          }
        }
        await setSchoolStatus(school.id, "approved", adminUser?.uid, teacherUid);
      } else {
        await setSchoolStatus(school.id, "rejected", adminUser?.uid);
      }
      setPending((p) => p.filter((s) => s.id !== school.id));
      showToast(`School ${approve ? "approved" : "rejected"} ✓`, "success");
    } catch (e) {
      showToast(`Failed: ${e.message}`, "error");
    }
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Counts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        {[
          ["Total users", usersList.length],
          ["Active (30d)", counts.active30d],
          ["Deleted accounts", counts.deleted],
          ["Admin user-data reads", counts.adminReads],
          ["Pending schools", pending.length],
        ].map(([label, value]) => (
          <div key={label} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>{value}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      <button onClick={exportCsv} style={{ justifySelf: "start", display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, background: "var(--bg-3)", border: "1px solid #333", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
        <Download size={15} /> Export audit CSV
      </button>

      {/* Pending schools */}
      <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: 20, borderBottom: "1px solid var(--border)", fontSize: 14, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>
          Pending Schools ({pending.length})
        </div>
        {loading ? (
          <div style={{ padding: 24, color: "var(--text-muted)", fontSize: 13 }}>Loading…</div>
        ) : pending.length === 0 ? (
          <div style={{ padding: 24, color: "var(--text-muted)", fontSize: 13 }}>No pending requests.</div>
        ) : (
          pending.map((s) => (
            <div key={s.id} style={{ padding: 20, borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{s.schoolName}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                {s.type} · {s.state}{s.lga ? `, ${s.lga}` : ""} · {s.studentCount || "?"} students · {s.contactName} ({s.contactEmail}, {s.contactPhone})
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <input
                  value={teacherEmail[s.id] || ""}
                  onChange={(e) => setTeacherEmail((m) => ({ ...m, [s.id]: e.target.value }))}
                  placeholder="Teacher account email (optional)"
                  style={{ flex: 1, minWidth: 220, background: "var(--bg)", border: "1px solid #333", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 13, outline: "none", fontFamily: "inherit" }}
                />
                <button onClick={() => decide(s, true)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 8, background: "#4ADE80", border: "none", color: "#000", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  <Check size={14} /> Approve
                </button>
                <button onClick={() => decide(s, false)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 8, background: "transparent", border: "1px solid #FF4D6A", color: "#FF4D6A", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  <X size={14} /> Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Partner commissions awaiting payout */}
      <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: 20, borderBottom: "1px solid var(--border)", fontSize: 14, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>
          Partner commissions — pending payout ({commissions.filter((c) => c.status !== "paid").length})
        </div>
        {commissions.length === 0 ? (
          <div style={{ padding: 24, color: "var(--text-muted)", fontSize: 13 }}>No pending commissions.</div>
        ) : (
          commissions.map((c) => (
            <div key={c.id} style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
                  ₦{Number(c.commissionNaira || 0).toLocaleString()} <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)" }}>
                    ({Math.round((c.rate || 0.2) * 100)}% of ₦{Number(c.amountPaidNaira || 0).toLocaleString()} · {String(c.plan || "").replace(/_/g, " ")})
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  School {String(c.schoolId || "").slice(0, 10)}… · ref {String(c.reference || "").slice(0, 20)}
                </div>
              </div>
              {c.status === "paid" ? (
                <span style={{ fontSize: 11, fontWeight: 700, color: "#4ADE80", padding: "6px 14px", borderRadius: 12, background: "rgba(74,222,128,0.12)" }}>PAID</span>
              ) : (
                <button
                  onClick={() => markCommissionPaid(c)}
                  disabled={payingRef === c.id}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: "#4ADE80", border: "none", color: "#000", fontWeight: 700, fontSize: 13, cursor: payingRef === c.id ? "wait" : "pointer", opacity: payingRef === c.id ? 0.7 : 1 }}
                >
                  <Check size={14} /> {payingRef === c.id ? "Marking…" : "Mark paid"}
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
        Every admin read of a user's data is logged to activityLog (action: admin_user_read) with the reason.
        Deleted accounts are anonymized immediately and purged by the scheduled Cloud Function after 30 days.
      </p>
    </div>
  );
}
