// api/survey-vote.js — server-authoritative survey voting.
//
// Voting used to be two client writes: create surveyVotes/{id}_{uid} then
// update surveys/{id} to bump the tally. That path was denied for normal
// users (surveys is admin-write only) → every student saw
// "insufficient permissions". Doing it here keeps surveys locked to admins
// while allowing a verified user to cast exactly ONE vote per survey.
//
// Dedup is atomic: the vote doc id is deterministic ({surveyId}_{uid}), and a
// transaction refuses a second vote, so tallies can never be inflated.

import { getFirebase } from "./_firebase.js";

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: { message: "Method not allowed" } });

  const fb = getFirebase();
  if (!fb) return res.status(500).json({ error: { message: "Survey backend unavailable." } });

  // ── Auth: verified Firebase ID token required.
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) {
    return res.status(401).json({ error: { message: "Sign in to vote." }, code: "AUTH_REQUIRED" });
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
  const surveyId = String(body.surveyId || "").trim().slice(0, 128);
  const optionIdx = Number(body.optionIdx);
  const rating = body.rating == null ? null : Number(body.rating);
  if (!surveyId || !Number.isInteger(optionIdx) || optionIdx < 0) {
    return res.status(400).json({ error: { message: "Missing surveyId or a valid optionIdx." } });
  }

  const surveyRef = fb.db.collection("surveys").doc(surveyId);
  const voteRef = fb.db.collection("surveyVotes").doc(`${surveyId}_${uid}`);

  try {
    const result = await fb.db.runTransaction(async (tx) => {
      const [surveySnap, voteSnap] = await Promise.all([tx.get(surveyRef), tx.get(voteRef)]);

      if (!surveySnap.exists) {
        return { status: 404, body: { error: { message: "This survey no longer exists." } } };
      }
      if (voteSnap.exists) {
        return { status: 200, body: { ok: true, already: true } };
      }

      const survey = surveySnap.data() || {};
      const options = Array.isArray(survey.options) ? survey.options : [];
      if (optionIdx >= options.length) {
        return { status: 400, body: { error: { message: "That option is not part of this survey." } } };
      }

      tx.set(voteRef, {
        surveyId,
        uid,
        optionIdx,
        rating,
        createdAt: fb.admin.firestore.FieldValue.serverTimestamp(),
      });
      const inc = fb.admin.firestore.FieldValue.increment;
      tx.update(surveyRef, {
        [`votes.${optionIdx}`]: inc(1),
        totalVotes: inc(1),
      });

      return { status: 200, body: { ok: true, already: false } };
    });

    return res.status(result.status).json(result.body);
  } catch (e) {
    console.warn("[survey-vote] transaction failed:", e?.message);
    return res.status(500).json({ error: { message: "Could not record your vote — try again." } });
  }
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}
