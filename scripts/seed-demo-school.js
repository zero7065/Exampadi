// scripts/seed-demo-school.js — creates a demo school + class + invite code
// for pilot demos. Signs in with an admin account (local .env only).
//
// Required env: SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD (+ Firebase VITE_* vars).
// Usage: node scripts/seed-demo-school.js
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore, collection, addDoc, setDoc, doc, serverTimestamp,
} from "firebase/firestore";
import fs from "node:fs";
import path from "node:path";

function loadDotEnv() {
  try {
    const text = fs.readFileSync(path.resolve(process.cwd(), ".env"), "utf8");
    for (const line of text.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const k = t.slice(0, eq).trim();
      if (!(k in process.env)) process.env[k] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    }
  } catch (_) { /* no .env file — rely on existing env */ }
}

async function main() {
  loadDotEnv();
  const { SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD } = process.env;
  if (!SEED_ADMIN_EMAIL || !SEED_ADMIN_PASSWORD) {
    console.error("Set SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD in .env (admin account, local only).");
    process.exit(1);
  }

  const app = initializeApp({
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  });
  const auth = getAuth(app);
  const db = getFirestore(app);

  const cred = await signInWithEmailAndPassword(auth, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD);
  console.log(`Signed in as ${cred.user.email}`);

  const schoolRef = await addDoc(collection(db, "schools"), {
    schoolName: "Demo Secondary School",
    state: "Lagos",
    lga: "Ikeja",
    type: "private",
    studentCount: "30",
    contactName: "Demo Principal",
    contactEmail: SEED_ADMIN_EMAIL,
    contactPhone: "08000000000",
    contactRole: "Principal",
    status: "approved",
    demo: true,
    createdAt: serverTimestamp(),
  });
  console.log(`School: ${schoolRef.id}`);

  const classRef = await addDoc(collection(db, "classes"), {
    schoolId: schoolRef.id,
    name: "SS3 A (Demo)",
    subject: "Physics",
    students: [],
    createdBy: cred.user.uid,
    createdAt: serverTimestamp(),
  });
  console.log(`Class: ${classRef.id}`);

  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  await setDoc(doc(db, "classInvites", code), {
    code,
    classId: classRef.id,
    schoolId: schoolRef.id,
    createdBy: cred.user.uid,
    emails: [],
    status: "open",
    usedBy: [],
    createdAt: serverTimestamp(),
  });
  console.log(`Invite code: ${code}  →  join at /join/${code}`);
  console.log("\nDone. Delete these docs from the console when finished demoing.");
}

main().catch((e) => {
  console.error("Seed failed:", e.message);
  process.exit(1);
});
