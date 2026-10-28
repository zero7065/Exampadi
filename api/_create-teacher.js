// api/create-teacher.js — Admin: create a teacher account under a school
import { getFirebase } from "./_firebase.js";

export default async function handler(req, res) {
  const fb = getFirebase();
  if (!fb) {
    return res.status(500).json({ error: "Backend unavailable" });
  }

  const { email, password, name, schoolId } = req.body || {};
  if (!email || !password || !name || !schoolId) {
    return res.status(400).json({ error: "Missing required fields: email, password, name, schoolId" });
  }

  try {
    // 1. Create Firebase Auth user
    const userRecord = await fb.admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    // 2. Create Firestore user profile
    await fb.db.collection("users").doc(userRecord.uid).set({
      email,
      name,
      role: "teacher",
      schoolId,
      onboarded: false,
      createdAt: fb.admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // 3. Return credentials to admin (password, email)
    return res.status(201).json({
      uid: userRecord.uid,
      email,
      password, // admin receives the generated password to share with teacher
      displayName: name,
    });
  } catch (err) {
    console.error("create-teacher error:", err.message);
    if (err.code === "auth/email-already-in-use") {
      return res.status(409).json({ error: "Email already registered" });
    }
    return res.status(500).json({ error: "Failed to create teacher account" });
  }
}