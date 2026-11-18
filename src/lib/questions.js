import { collection, getDocs, query, where, limit as firestoreLimit, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { getQuestionsFromBank } from "../data/questions/compat";
import { askGroq } from "./ai";

export async function getQuestions(subject, topic, count = 10) {
  const results = [];

  if (db) {
    try {
      const constraints = [where("subject", "==", subject)];
      if (topic) constraints.push(where("topic", "==", topic));
      constraints.push(firestoreLimit(count));

      const q = query(collection(db, "questions"), ...constraints);
      const snapshot = await getDocs(q);
      snapshot.forEach((doc) => results.push({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.warn("Firestore questions fetch failed, using local bank", e);
    }
  }

  if (results.length === 0) {
    const local = getQuestionsFromBank({ subject, topic, count });
    results.push(...local.map((q, i) => ({ ...q, id: q.id || `${subject}_local_${i}` })));
  }

  return results.length <= count ? results : results.slice(0, count);
}

export async function saveSession(userId, sessionData) {
  const sessionPayload = {
    ...sessionData,
    completedAt: serverTimestamp(),
    xpEarned: sessionData.xpEarned || calculateXP(sessionData),
  };

  if (db && userId) {
    try {
      const sessionsRef = collection(db, "userSessions", userId, "sessions");
      const docRef = await addDoc(sessionsRef, sessionPayload);
      return docRef.id;
    } catch (e) {
      console.warn("Firestore save failed, saving to localStorage", e);
    }
  }

  return saveSessionLocal(userId, sessionPayload);
}

export async function generateQuestionsWithAI(subject, topic, count = 5) {
  const prompt = `Generate ${count} Nigerian ${subject} exam questions${topic ? ` on topic: ${topic}` : ""}. 
Return ONLY a valid JSON array. Each question object must have: 
{ "question": "string", "options": {"A":"...","B":"...","C":"...","D":"..."}, "correctAnswer": "A|B|C|D", "explanation": "string", "topic": "string", "difficulty": "easy|medium|hard" }
Do NOT include any text outside the JSON array.`;

  try {
    const text = await askGroq(
      "You are a Nigerian exam question generator. Return only valid JSON.",
      prompt,
      { maxTokens: 3000, temperature: 0.7 }
    );

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.map((q, i) => {
      const answer = q.answer || q.correctAnswer;
      return {
        ...q,
        answer,
        correctAnswer: answer,
        id: `ai_${Date.now()}_${i}`,
        subject,
        exam: "JAMB",
      };
    });
  } catch (e) {
    console.warn("[AI] generateQuestionsWithAI failed:", e.message);
    return [];
  }
}

function calculateXP(session) {
  const base = session.correctAnswers * 10;
  const bonus = session.percentageScore >= 80 ? 50 : session.percentageScore >= 60 ? 25 : 0;
  return base + bonus;
}

function saveSessionLocal(userId, sessionData) {
  const key = `exampadi_sessions_${userId}`;
  const existing = JSON.parse(localStorage.getItem(key) || "[]");
  existing.push({ ...sessionData, completedAt: new Date().toISOString(), _unsynced: true });
  localStorage.setItem(key, JSON.stringify(existing));
  return `local_${Date.now()}`;
}

// Push locally-saved (unsynced) sessions to Firestore when back online.
// Called on app start + reconnect. Never throws.
export async function flushLocalSessions() {
  if (!db) return 0;
  let flushed = 0;
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("exampadi_sessions_")) keys.push(k);
    }
    for (const key of keys) {
      const userId = key.replace("exampadi_sessions_", "");
      let list = [];
      try { list = JSON.parse(localStorage.getItem(key) || "[]"); } catch { continue; }
      const pending = list.filter((s) => s && s._unsynced);
      if (pending.length === 0) continue;
      const remaining = [];
      for (const s of pending) {
        try {
          const { _unsynced, ...payload } = s;
          await addDoc(collection(db, "userSessions", userId, "sessions"), {
            ...payload,
            completedAt: serverTimestamp(),
          });
          flushed++;
        } catch {
          remaining.push(s);
        }
      }
      const synced = list.filter((s) => !s._unsynced);
      localStorage.setItem(key, JSON.stringify([...synced, ...remaining]));
    }
  } catch (e) {
    console.warn("flushLocalSessions failed:", e?.message);
  }
  return flushed;
}