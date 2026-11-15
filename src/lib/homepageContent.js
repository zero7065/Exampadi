// Homepage content — admin-editable hero slides + section toggles.
// Stored in Firestore siteContent/homepage. Falls back to defaults when unset.
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";

const DOC = "siteContent/homepage";

export const DEFAULT_HOMEPAGE = {
  slides: [
    {
      id: "study",
      scene: "study",
      eyebrow: "AI-POWERED EXAM PREP",
      title: "Ace Your Exams with AI-Powered Precision",
      body: "1,594 real past questions from JAMB, WAEC, NECO, NABTEB, IELTS & SAT — with AI explanations, timed exams, and smart progress tracking.",
      ctaLabel: "Start Free",
      ctaTo: "/auth",
      secondaryLabel: "Try a demo",
      secondaryTo: "/demo",
    },
    {
      id: "graduation",
      scene: "graduation",
      eyebrow: "BUILT FOR SUCCESS",
      title: "From SS1 to First Choice University",
      body: "Personalized study plans, daily streaks, and XP that keep you consistent. Join thousands of Nigerian students passing first try.",
      ctaLabel: "Begin now",
      ctaTo: "/auth",
      secondaryLabel: "IELTS pathway",
      secondaryTo: "/ielts",
    },
    {
      id: "community",
      scene: "community",
      eyebrow: "NEVER STUDY ALONE",
      title: "Your School Community, Live",
      body: "Private school group chats with AI assist, study rooms with friends, and challenges that make learning social — all in one app.",
      ctaLabel: "Join your school",
      ctaTo: "/auth",
      secondaryLabel: "See community",
      secondaryTo: "/community",
    },
  ],
  sections: {
    whatsNew: true,
    eduClips: true,
    games: true,
    testimonials: true,
    pricing: true,
    faq: true,
  },
};

export async function loadHomepageContent() {
  if (!db) return DEFAULT_HOMEPAGE;
  try {
    const snap = await getDoc(doc(db, DOC));
    if (snap.exists()) {
      const data = snap.data() || {};
      return {
        slides: Array.isArray(data.slides) && data.slides.length > 0 ? data.slides : DEFAULT_HOMEPAGE.slides,
        sections: { ...DEFAULT_HOMEPAGE.sections, ...(data.sections || {}) },
      };
    }
  } catch (e) {
    console.warn("homepage load failed:", e.message);
  }
  return DEFAULT_HOMEPAGE;
}

export async function saveHomepageContent(content) {
  if (!db) throw new Error("Firestore not configured");
  await setDoc(doc(db, DOC), {
    slides: content.slides,
    sections: content.sections,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return content;
}

export function invalidateHomepageCache() {
  try { localStorage.removeItem("exampadi_homepage_content"); } catch { /* private mode */ }
}