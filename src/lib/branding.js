// src/lib/branding.js — Site branding & contact settings stored in Firestore.
// Read once at app bootstrap; admin can override via /admin (Branding tab).
// No Firebase Storage billing required — only text URLs/settings.
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

const BRANDING_DOC = "siteContent/branding";

export const DEFAULT_BRANDING = {
  siteName: "ExamPadi",
  tagline: "Pass JAMB, WAEC & NABTEB First Try",
  backgroundImageUrl: "",
  backgroundPreset: "",
  footerText: "Developed by Jadai Studios",
  contactEmail: "jadai7065@gmail.com",
  contactPhone: "+234 812 763 6057",
  contactWhatsApp: "https://wa.me/2348127636057",
  supportWhatsApp: "+234 812 763 6057",
};

// Code-drawn background presets (no upload needed) for the auth/sign-in shell.
export const BACKGROUND_PRESETS = {
  aurora: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
  mesh: "radial-gradient(circle at 18% 22%, rgba(99,102,241,0.35), transparent 45%), radial-gradient(circle at 82% 28%, rgba(168,85,247,0.28), transparent 45%), radial-gradient(circle at 50% 88%, rgba(34,197,94,0.22), transparent 45%), #0b1020",
  sunset: "linear-gradient(135deg, #2b1055 0%, #7597de 55%, #ff6e7f 100%)",
  forest: "linear-gradient(135deg, #0b3d2e 0%, #14532d 55%, #052e16 100%)",
  midnight: "linear-gradient(135deg, #0b1020 0%, #1a1b3a 55%, #2d1b4e 100%)",
  grid: "repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 40px), linear-gradient(135deg, #0b1020, #1b263b)",
};

export async function loadBranding() {
  if (!db) return { ...DEFAULT_BRANDING };
  try {
    const snap = await getDoc(doc(db, BRANDING_DOC));
    if (snap.exists()) return { ...DEFAULT_BRANDING, ...snap.data() };
  } catch (e) {
    console.warn("branding load failed:", e.message);
  }
  return { ...DEFAULT_BRANDING };
}

export async function saveBranding(updates) {
  if (!db) throw new Error("Firestore not configured");
  await setDoc(
    doc(db, BRANDING_DOC),
    { ...updates, updatedAt: new Date().toISOString() },
    { merge: true },
  );
  return updates;
}
