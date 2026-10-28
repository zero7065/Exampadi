// api/grade-assignment.js — server-side grading so answer keys never reach students.
import { cors, parseBody, requireUser } from "./_auth.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: { message: "POST only" } });

  const auth = await requireUser(req, res);
  if (!auth) return;
  const { fb, uid } = auth;
  const { assignmentId, answers = {} } = parseBody(req);
  if (!assignmentId) return res.status(400).json({ error: { message: "assignmentId required" } });

  try {
    const assignmentRef = fb.db.collection("teacherAssignments").doc(assignmentId);
    const assignmentSnap = await assignmentRef.get();
    if (!assignmentSnap.exists) return res.status(404).json({ error: { message: "Assignment not found" } });
    const assignment = assignmentSnap.data();

    const userSnap = await fb.db.collection("users").doc(uid).get();
    const user = userSnap.exists ? userSnap.data() : {};
    const targetIds = Array.isArray(assignment.studentIds) ? assignment.studentIds : [];
    const classIds = Array.isArray(user.classIds) ? user.classIds : [];
    const isTarget = targetIds.includes(uid) || (assignment.classId && classIds.includes(assignment.classId));
    if (!isTarget) return res.status(403).json({ error: { message: "This assignment is not assigned to you." } });

    const keySnap = await assignmentRef.collection("key").get();
    const keys = {};
    keySnap.forEach((d) => { keys[d.id] = d.data(); });

    const questions = Array.isArray(assignment.questions) ? assignment.questions : [];
    let correctCount = 0;
    for (const q of questions) {
      const given = String(answers[q.id] ?? answers[String(q.id)] ?? "").trim().toUpperCase();
      const expected = String(keys[String(q.id)]?.correctAnswer ?? "").trim().toUpperCase();
      if (given && given === expected) correctCount += 1;
    }
    const total = questions.length || 1;
    const score = Math.round((correctCount / total) * 100);

    await assignmentRef.collection("submissions").doc(uid).set({
      studentUid: uid,
      answers,
      correctCount,
      total,
      score,
      status: "submitted",
      submittedAt: fb.admin.firestore.FieldValue.serverTimestamp(),
      gradedAt: fb.admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return res.status(200).json({ score, correctCount, total });
  } catch (e) {
    console.error("grade-assignment failed:", e);
    return res.status(500).json({ error: { message: "Could not grade assignment." } });
  }
}
