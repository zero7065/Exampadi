# ExamPadi

JAMB/WAEC/NECO/NABTEB exam prep app with AI-powered tutoring, Pro subscriptions, and adaptive practice.

**Live:** https://exampadi.vercel.app

## Features

- **9,000+ practice questions** across 16 subjects (10 years: JAMB/WAEC/NECO/NABTEB/IELTS)
- **Groq AI Tutor** — instant explanations for any question or topic
- **CBT Simulator** — timed exam simulation with real scoring
- **Mock Exams** — full-length practice tests
- **Adaptive Practice** — picks questions based on your weak areas
- **Pro Subscriptions** — Paystack integration (monthly & yearly plans)
- **Admin Console** — user management, Pro assignment, question CRUD
- **Leaderboard & Mastery** — real-time rankings and accuracy tracking
- **Study Partners** — find and connect with other students
- **Assignments** — create and complete practice assignments
- **Whiteboard** — draw diagrams while studying
- **WhatsApp Share** — share questions with friends
- **XP & Streak System** — gamified learning
- **Dark/Light Theme**
- **Fully Responsive** — desktop sidebar + mobile bottom nav

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, Tailwind CSS |
| Auth & DB | Firebase SDK (v12) — Auth, Firestore |
| AI | Groq API (server-side proxy) |
| Payments | Paystack |
| Hosting | Vercel |

## Quick Start

```bash
npm install
cp .env.example .env   # Fill in your keys
npm run dev             # http://localhost:5173
```

## Environment Variables

```bash
# Firebase (Required)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=

# Web push (optional until you enable notifications)
VITE_FIREBASE_VAPID_KEY=

# Server-only keys (never prefix these with VITE_)
GROQ_API_KEY=
FIREBASE_SERVICE_ACCOUNT=
GEMINI_API_KEY=
PAYSTACK_SECRET_KEY=

# Paystack public key (safe in the browser)
VITE_PAYSTACK_PUBLIC_KEY=

# Admin (optional)
VITE_ADMIN_UIDS=
```

## Deploy to Vercel

1. Push to GitHub
2. Import repo at vercel.com/new
3. Add all env vars in **Settings → Environment Variables**
4. Deploy

## Project Structure

```
src/
  components/    Navbar, ProtectedRoute, AdminRoute, Whiteboard, WhatsAppShare, etc.
  context/       AuthContext, ThemeContext, StudyContext
  hooks/         useSubscription, useOnboarding, usePaystack, useNotifications
  lib/           userProfile, usageTracker, activityLog, gemini (Groq)
  pages/         Dashboard, AITutor, CBTSimulator, AdminPage, Leaderboard, etc.
  data/          master-bank/*.json (9,000+ practice-question target)
  config/        plans.js (Free, Pro Monthly, Pro Yearly)
```

## Admin Access

- Set `VITE_SEED_ADMIN_EMAIL` and `VITE_SEED_ADMIN_PASSWORD` locally to auto-seed.
- Set the user document `role` to `"admin"` in Firestore.
- Admin auto-redirects to `/admin` on login.
- Hidden from non-admin users (no nav link).

## Contact

- WhatsApp: +2348127636057
- Email: jadai7065@gmail.com
- Developed by Jadai Studios
