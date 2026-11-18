import {
  doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
  collection, query, where, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebaseConfig";

// ============================================================
// PARTNERS
// ============================================================

export async function addPartner(userId, partnerUid) {
  if (userId === partnerUid) throw new Error("Cannot add yourself as a partner");
  const pairId = [userId, partnerUid].sort().join("_");
  const pairDoc = doc(db, "studyPairs", pairId);
  const existing = await getDoc(pairDoc);
  if (existing.exists()) throw new Error("Already partners");

  await setDoc(pairDoc, {
    users: [userId, partnerUid],
    createdAt: serverTimestamp(),
    status: "active",
  });

  return pairId;
}

export async function removePartner(userId, partnerUid) {
  const pairId = [userId, partnerUid].sort().join("_");
  await deleteDoc(doc(db, "studyPairs", pairId));
}

export async function getPartners(userId) {
  const q1 = query(collection(db, "studyPairs"), where("users", "array-contains", userId));
  const snap = await getDocs(q1);
  const partners = [];
  for (const pairDoc of snap.docs) {
    const data = pairDoc.data();
    if (data.status === "active") {
      const partnerUid = data.users.find((u) => u !== userId);
      if (partnerUid) {
        try {
          const userSnap = await getDoc(doc(db, "users", partnerUid));
          if (userSnap.exists()) {
            partners.push({
              uid: partnerUid,
              pairId: pairDoc.id,
              ...userSnap.data(),
            });
          }
        } catch (e) {
          console.warn("Failed to fetch partner profile:", partnerUid, e);
        }
      }
    }
  }
  return partners;
}

export async function isPartner(userId, otherUid) {
  const pairId = [userId, otherUid].sort().join("_");
  const snap = await getDoc(doc(db, "studyPairs", pairId));
  return snap.exists() && snap.data().status === "active";
}

// ============================================================
// INVITATIONS
// ============================================================

export async function createInvitation(fromUid, fromName, fromEmail) {
  const inviteId = `inv_${fromUid}_${Date.now()}`;
  await setDoc(doc(db, "invitations", inviteId), {
    fromUid,
    fromName,
    fromEmail,
    status: "pending",
    createdAt: serverTimestamp(),
  });
  return inviteId;
}

export async function acceptInvitation(inviteId, toUid) {
  const inviteSnap = await getDoc(doc(db, "invitations", inviteId));
  if (!inviteSnap.exists()) throw new Error("Invitation not found");
  const invite = inviteSnap.data();
  if (invite.status !== "pending") throw new Error("Invitation already used");

  await updateDoc(doc(db, "invitations", inviteId), {
    status: "accepted",
    acceptedBy: toUid,
    acceptedAt: serverTimestamp(),
  });

  await addPartner(invite.fromUid, toUid);
  return invite.fromUid;
}

export async function getPendingInvitations(_userEmail) {
  const q = query(
    collection(db, "invitations"),
    where("status", "==", "pending")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ============================================================
// SHARED TESTS (Pro feature)
// ============================================================

export async function createSharedTest(creatorUid, creatorName, config) {
  const testId = `st_${creatorUid}_${Date.now()}`;
  await setDoc(doc(db, "sharedTests", testId), {
    creatorUid,
    creatorName,
    partnerUid: config.partnerUid,
    subject: config.subject,
    questionCount: config.questionCount || 10,
    timeLimit: config.timeLimit || 600,
    status: "pending",
    createdAt: serverTimestamp(),
  });
  return testId;
}

export async function acceptSharedTest(testId, _partnerUid) {
  await updateDoc(doc(db, "sharedTests", testId), {
    status: "active",
    partnerJoinedAt: serverTimestamp(),
  });
}

export async function submitSharedTest(testId, uid, results) {
  const field = `results_${uid}`;
  await updateDoc(doc(db, "sharedTests", testId), {
    [field]: {
      score: results.score,
      correct: results.correct,
      total: results.total,
      timeSeconds: results.timeSeconds,
      completedAt: serverTimestamp(),
    },
    status: "completed",
  });
}

export async function getSharedTest(testId) {
  const snap = await getDoc(doc(db, "sharedTests", testId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function getPartnerTests(userId) {
  const q1 = query(
    collection(db, "sharedTests"),
    where("creatorUid", "==", userId)
  );
  const q2 = query(
    collection(db, "sharedTests"),
    where("partnerUid", "==", userId)
  );
  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  const tests = [];
  const seen = new Set();
  for (const s of [...snap1.docs, ...snap2.docs]) {
    if (!seen.has(s.id)) {
      seen.add(s.id);
      tests.push({ id: s.id, ...s.data() });
    }
  }
  return tests.sort((a, b) => {
    const ta = a.createdAt || 0;
    const tb = b.createdAt || 0;
    return tb - ta;
  });
}

// ============================================================
// LEADERBOARD (partner comparison)
// ============================================================

export async function getPartnerLeaderboard(userId) {
  const partners = await getPartners(userId);
  const all = [userId, ...partners.map((p) => p.uid)];
  const results = [];

  for (const uid of all) {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      const d = snap.data();
      results.push({
        uid,
        name: d.displayName || "Student",
        xp: d.totalXP || d.xp || 0,
        streak: d.streak || 0,
        totalQuestions: d.totalQuestionsAnswered || 0,
        sessions: d.totalSessions || 0,
        isMe: uid === userId,
      });
    }
  }

  return results.sort((a, b) => b.xp - a.xp);
}
