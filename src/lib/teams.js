// src/lib/teams.js — group/classroom subscriptions.
//
// One person pays for N seats in a single Paystack charge. The team gets a
// shareable code; each member who redeems it receives Pro until the team's
// expiry. The payer always occupies the first seat.
import {
  doc, setDoc, getDoc, getDocs, updateDoc, collection, query, where,
  serverTimestamp, arrayUnion, increment, orderBy, limit, onSnapshot, addDoc,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { TEAM_MIN_SEATS, TEAM_MAX_SEATS, TEAM_PLANS, teamPrice } from "../config/plans";
import { logActivity } from "./activityLog";

function needDb() {
  if (!db) throw new Error("Not available offline");
}

function makeCode(prefix = "TEAM") {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${s}`;
}

export function teamExpiry(plan, fromDate = new Date()) {
  const d = new Date(fromDate);
  if (String(plan).includes("yearly")) d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

// Called BEFORE payment to reserve the team doc (status: pending).
export async function createTeamDraft({ name, plan, seats, payerUid, payerEmail }) {
  needDb();
  if (!TEAM_PLANS[plan]) throw new Error("Unknown team plan");
  const n = Math.min(TEAM_MAX_SEATS, Math.max(TEAM_MIN_SEATS, Math.floor(seats || TEAM_MIN_SEATS)));
  const code = makeCode();
  const ref = doc(collection(db, "teams"));
  await setDoc(ref, {
    name: String(name || "My Team").slice(0, 60),
    code,
    plan,
    seats: n,
    seatsUsed: 0,
    members: [],
    payerUid,
    payerEmail,
    status: "pending",
    createdAt: serverTimestamp(),
  });
  return { teamId: ref.id, code, seats: n, total: teamPrice(plan, n) };
}

// Called AFTER successful Paystack charge (client) — activates the team and
// grants the payer their seat immediately.
export async function activateTeam({ teamId, payerUid, payerEmail, reference, amountNaira }) {
  needDb();
  const ref = doc(db, "teams", teamId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Team not found");
  const team = snap.data();
  if (team.status === "active") return team;

  const expiry = teamExpiry(team.plan).toISOString();
  try {
    await updateDoc(ref, {
      status: "active",
      reference: reference || null,
      amountPaid: amountNaira || teamPrice(team.plan, team.seats),
      activatedAt: serverTimestamp(),
      members: arrayUnion(payerUid),
      seatsUsed: increment(1),
    });
    await updateDoc(doc(db, "users", payerUid), {
      subscription: {
        plan: team.plan,
        status: "active",
        reference: reference || `team-${teamId}`,
        startDate: serverTimestamp(),
        endDate: expiry,
        autoRenew: false,
        viaTeam: teamId,
      },
      teamIds: arrayUnion(teamId),
    });
  } catch (e) {
    console.error("activateTeam failed:", e);
    throw new Error("Team activation failed. Please contact support — do NOT pay again.", { cause: e });
  }
  await logActivity({
    action: "team_activated", userId: payerUid, email: payerEmail,
    details: { teamId, plan: team.plan, seats: team.seats, reference },
  }).catch(() => {});
  return { ...team, status: "active", expiry };
}

// A member redeems the team code → Pro until team expiry (if seats remain).
export async function joinTeamByCode(code, uid) {
  needDb();
  const clean = String(code || "").trim().toUpperCase();
  const snap = await getDocs(query(collection(db, "teams"), where("code", "==", clean)));
  if (snap.empty) throw new Error("Team code not found");
  const teamDoc = snap.docs[0];
  const team = teamDoc.data();

  if (team.status !== "active") throw new Error("This team is not active yet");
  if ((team.members || []).includes(uid)) throw new Error("You're already in this team");
  if ((team.seatsUsed || 0) >= (team.seats || 0)) throw new Error("This team is full");

  const expiry = teamExpiry(team.plan, team.activatedAt?.toDate ? team.activatedAt.toDate() : new Date()).toISOString();
  await updateDoc(teamDoc.ref, { members: arrayUnion(uid), seatsUsed: increment(1) });
  await updateDoc(doc(db, "users", uid), {
    subscription: {
      plan: team.plan,
      status: "active",
      reference: `team-${teamDoc.id}`,
      startDate: serverTimestamp(),
      endDate: expiry,
      autoRenew: false,
      viaTeam: teamDoc.id,
    },
    teamIds: arrayUnion(teamDoc.id),
  });
  await logActivity({
    action: "team_joined", userId: uid,
    details: { teamId: teamDoc.id, teamName: team.name },
  });
  return { teamId: teamDoc.id, teamName: team.name, plan: team.plan, expiry };
}

export async function getMyTeams(uid) {
  needDb();
  const snap = await getDocs(query(collection(db, "teams"), where("payerUid", "==", uid)));
  const mine = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const userSnap = await getDoc(doc(db, "users", uid));
  const teamIds = userSnap.exists() ? userSnap.data().teamIds || [] : [];
  const joined = [];
  for (const tid of teamIds) {
    const t = await getDoc(doc(db, "teams", tid)).catch(() => null);
    if (t && t.exists() && t.id !== undefined && !mine.some((m) => m.id === t.id)) {
      joined.push({ id: t.id, ...t.data() });
    }
  }
  return { mine, joined };
}

export async function deactivateTeam(teamId, adminUid, adminEmail) {
  needDb();
  await updateDoc(doc(db, "teams", teamId), { status: "revoked" });
  await logActivity({
    action: "team_revoked", userId: adminUid, email: adminEmail,
    details: { teamId },
  });
}

export async function getTeam(teamId) {
  needDb();
  const snap = await getDoc(doc(db, "teams", teamId));
  if (!snap.exists()) throw new Error("Team not found");
  return { id: snap.id, ...snap.data() };
}

// ─── Team community: shared thread + pinned insights ───
export async function sendTeamMessage(teamId, { fromUid, fromName, text = "", question = null }) {
  needDb();
  const clean = String(text || "").trim().slice(0, 1000);
  if (!clean && !question) throw new Error("Empty message");
  await addDoc(collection(db, "teams", teamId, "messages"), {
    fromUid,
    fromName: String(fromName || "Student").slice(0, 60),
    text: clean,
    question: question || null,
    createdAt: serverTimestamp(),
  });
}

export function subscribeTeamMessages(teamId, cb) {
  const q = query(collection(db, "teams", teamId, "messages"), orderBy("createdAt", "asc"), limit(200));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, () => cb([]));
}

export async function pinInsight(teamId, { title, body, authorUid, authorName }) {
  needDb();
  if (!String(title || "").trim() && !String(body || "").trim()) throw new Error("Nothing to pin");
  await addDoc(collection(db, "teams", teamId, "insights"), {
    title: String(title || "").slice(0, 80),
    body: String(body || "").slice(0, 1000),
    authorUid,
    authorName: String(authorName || "Student").slice(0, 60),
    createdAt: serverTimestamp(),
  });
}

export async function listInsights(teamId) {
  needDb();
  const snap = await getDocs(query(collection(db, "teams", teamId, "insights"), orderBy("createdAt", "desc"), limit(50)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listTeamsForAdmin() {
  needDb();
  const snap = await getDocs(query(collection(db, "teams"), orderBy("createdAt", "desc"), limit(100)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
