// api/room-answer.js — server-authoritative study-room grading.
//
// Rooms used to ship every question's correctAnswer inside the readable room
// doc, and the client both graded its own answers and wrote progress. A
// signed-in user could read the answers to every question (approved rooms are
// readable by anyone) and forge a perfect leaderboard.
//
// Now the answer key lives in studyRooms/{code}/key/{qid}, which
// firestore.rules denies to ALL clients; only this endpoint (Admin SDK
// bypasses rules) reads it. The client posts a pick, the server compares,
// updates the user's progress, and returns the verdict for display.
//
// Dedup: studyRooms/{code}/responses/{uid} stores one graded pick per
// question, so a resubmitted answer never double-counts.

import { getFirebase } from "./_firebase.js";

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const fb = getFirebase();
  if (!fb) {
    return res.status(500).json({ error: { message: "Room backend unavailable." } });
  }

  // ── Auth: verified Firebase ID token required.
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) {
    return res.status(401).json({ error: { message: "Sign in to answer." }, code: "AUTH_REQUIRED" });
  }

  let uid;
  try {
    const decoded = await fb.admin.auth().verifyIdToken(token);
    uid = decoded?.uid;
    if (!uid) throw new Error("no uid");
  } catch {
    return res.status(401).json({ error: { message: "Your session expired — sign in again." }, code: "AUTH_INVALID" });
  }

  // ── Payload
  const body = typeof req.body === "string" ? safeParse(req.body) : req.body;
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: { message: "Invalid request body." } });
  }
  const code = String(body.roomCode || "").trim().toUpperCase().slice(0, 16);
  const questionId = String(body.questionId || "").slice(0, 128);
  const answer = String(body.answer || "").trim().toUpperCase().slice(0, 8);
  if (!code || !questionId || !answer) {
    return res.status(400).json({ error: { message: "Missing roomCode, questionId, or answer." } });
  }

  const roomRef = fb.db.collection("studyRooms").doc(code);
  const keyRef = roomRef.collection("key").doc(questionId);
  const respRef = roomRef.collection("responses").doc(uid);

  try {
    const result = await fb.db.runTransaction(async (tx) => {
      const [roomSnap, keySnap, respSnap] = await Promise.all([
        tx.get(roomRef), tx.get(keyRef), tx.get(respRef),
      ]);

      if (!roomSnap.exists) {
        return { status: 404, body: { error: { message: "Room not found." } } };
      }
      const room = roomSnap.data();

      // Must be a member (joinRoom adds the progress entry on entry).
      const progress = room.progress || {};
      if (!progress[uid]) {
        return { status: 403, body: { error: { message: "Join this room before answering." }, code: "NOT_MEMBER" } };
      }

      const q = (room.questions || []).find((x) => String(x.id) === questionId);
      if (!q) {
        return { status: 400, body: { error: { message: "Unknown question for this room." } } };
      }

      // Prefer the hidden key; fall back to legacy rooms created before the
      // split, whose questions still embed correctAnswer server-readable.
      let correct = null;
      if (keySnap.exists) {
        correct = String(keySnap.data()?.correct || "").toUpperCase().trim() || null;
      }
      if (correct === null && q.correctAnswer) {
        correct = String(q.correctAnswer).toUpperCase().trim();
      }
      if (!correct) {
        // No gradable key for this question — don't corrupt progress; ask host
        // to recreate the room (or an admin to set the key).
        return { status: 404, body: { error: { message: "Answer key missing for this question." }, code: "KEY_MISSING" } };
      }

      // Dedup: returning the earlier verdict without touching counters.
      const responses = respSnap.exists ? (respSnap.data() || {}) : {};
      const prior = responses[questionId];
      if (prior) {
        return {
          status: 200,
          body: {
            isCorrect: Boolean(prior.isCorrect),
            correctAnswer: correct,
            explanation: String(keySnap.exists ? keySnap.data()?.explanation || "" : q.explanation || ""),
            already: true,
            progress: snapshotProgress(progress, uid),
          },
        };
      }

      const isCorrect = answer === correct;
      const explanation = String(keySnap.exists ? keySnap.data()?.explanation || "" : q.explanation || "");

      // Write the graded response so re-answers are idempotent...
      tx.set(respRef, { [questionId]: { picked: answer, isCorrect } }, { merge: true });
      // ...and bump counters. Server-only: firestore.rules blocks clients
      // from writing progress themselves.
      const inc = fb.admin.firestore.FieldValue.increment;
      tx.update(roomRef, {
        [`progress.${uid}.answered`]: inc(1),
        [`progress.${uid}.correct`]: inc(isCorrect ? 1 : 0),
        [`progress.${uid}.updatedAt`]: fb.admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        status: 200,
        body: { isCorrect, correctAnswer: correct, explanation, already: false, progress: snapshotProgress(progress, uid, 1, isCorrect ? 1 : 0) },
      };
    });

    return res.status(result.status).json(result.body);
  } catch (e) {
    console.warn("[room-answer] transaction failed:", e?.message);
    return res.status(500).json({ error: { message: "Could not grade that answer — try again." } });
  }
}

function snapshotProgress(progress, uid, answeredDelta = 0, correctDelta = 0) {
  const mine = progress[uid] || {};
  return {
    answered: Number(mine.answered || 0) + answeredDelta,
    correct: Number(mine.correct || 0) + correctDelta,
    total: Number(mine.total || 0),
  };
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}
