import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, addDoc, collection } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedData() {
  console.log("Seeding data to Firebase...");
  try {
    // Seed global stats
    await setDoc(doc(db, "stats", "global"), {
      totalUsers: 47,
      totalQuestions: 2841,
      questionsToday: 183,
      activePastHour: 12,
      seeded: true,
    });
    console.log("Global stats seeded.");

    // Seed public activity
    const activities = [
      "Tunde from Lagos scored 82% in Physics 🔥",
      "Chisom from Enugu just went Pro 🚀",
      "Fatima from Kano is on a 7-day streak 🔥",
      "Emeka from Abuja scored 91% in Mathematics — personal best! 🏆",
      "Blessing from Port Harcourt completed a full CBT simulation — scored 312/400",
      "Segun from Ibadan just started their first practice session 📚",
      "Ngozi from Calabar scored 74% in Chemistry 🔥",
      "Uche from Jos just went Pro 🚀",
      "Amara from Benin City is on a 5-day streak 🔥",
      "Kelechi from Owerri scored 88% in Economics — personal best! 🏆",
    ];

    for (const message of activities) {
      await addDoc(collection(db, "publicActivity"), {
        message,
        type: "session_complete",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });
    }

    console.log("✅ Seed data written successfully");
    process.exit(0);
  } catch(e) {
    console.error("Error seeding data:", e);
    process.exit(1);
  }
}

seedData();
