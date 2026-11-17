# ExamPadi — AI Agent Progress & Plan

Living document for the build agent. Read this first to resume without losing context.
Keep it updated after every work session.

---

## 0. Ground rules

- **Real data only.** Never ship placeholder/dummy content. Questions are real and validated.
- **Build gate:** `npm run build` runs `scripts/check-env.js` + `scripts/validate-bank.js`. The build FAILS on invalid question data. Always run it before committing.
- **Commit only when asked / at end of a batch.** Push to `origin/main`.
- **Firestore/Storage rules require manual deploy:** `firebase deploy --only firestore:rules,storage`.
- **Roles:** `user` / `student`, `teacher`, `management`, `admin`. Admin = email `jadai7065@gmail.com` or `VITE_ADMIN_UIDS`.
- **Separate experiences:** students never see teacher/management/admin buttons; teachers get their own dashboard; management is school-scoped; admin sees everything.
- No comments in code unless asked. Follow existing file style.

---

## 1. Current state (summary)

- **Question bank:** 1,594 validated real questions across 7 banks — 0 placeholders.
  - JAMB 721 · WAEC 373 · NECO 131 · NABTEB 108 · POST-UTME 25 · IELTS 147 · SAT 89.
  - Subjects: 24 (incl. French, Further Maths, vocational NABTEB subjects).
- **Build:** passes. Latest pushed commits tracked in git log on `main`.
- **Vercel:** project `examexpo-y9d5`. Crons: `/api/reminders` (06:00), `/api/cron/sync` (04:00).

---

## 2. Feature inventory (what exists)

### Accounts & roles
- Email/password + Google auth; recovery PIN.
- Signup account type: **Student / Teacher** (`accountType`), `role` set at creation.
- **Official Teacher Portal** (`/teacher/signup`, `/teacher/login`) — separate signup/login/Google; creates `role:"teacher"`. Student accounts cannot be upgraded to teacher (portal blocks student Google accounts; role is creation-only).
- Independent teacher auto-provisions a personal workspace (`schoolId = personal_<uid>`).
- `roles.js`: `isTeacherRole`, `isManagementRole`.
- Admin manages teacher accounts (list + revoke) in Admin → Teacher Invites tab.

### School / teacher / management
- `SchoolSignup` → `schools` doc (pending) → admin approve (`setSchoolStatus`) → teacher codes + default class + partner enrollment.
- `createClass`, `listTeacherClasses(teacherId)`, `createClassInvite` (join via `/api/class-invite`).
- Teacher dashboard: roster, heatmap, weak topics, leaderboard, assignments, lesson plans, classroom, parent reports, reviews, teacher tools.
- `TeacherTools`: polls, attention requests, announcements, live analytics.
- **Management**: created ONLY for an approved school via `/api/create-management` (admin-only, verifies school approved). Management dashboard `/management` (school-scoped counts + smart sync + community). Rules helpers `isManagement()`, `isManagerOf(schoolId)`.

### Study & exam
- Practice, CBT simulator, Mock exam — all with **movable Scratchpad + calculator** (never covers questions).
- Question bank with filters, expand, **CSV export**, **share**.
- Study plan with **CSV timetable export**; flashcards; reference library; learning feed (RSS `/api/rss/learning`); video lessons.

### Games
- Chess vs AI (`lib/games/chessEngine.js`, 10 levels, minimax) → `ChessPage`.
- Chess multiplayer (`lib/games/chessMultiplayer.js`) → `ChessRoomPage` (timer/unlimited/custom, share invite).
- **Live trivia multiplayer** (`lib/games/triviaRooms.js`) → `TriviaRoomPage` (`/games/trivia/room`): real-time 1v1, shared questions, live scores, per-question timer, winner.
- Shareable chess results (`lib/games/chessResults.js`) → `ChessResultPage` (public, likes, challenge CTA).
- Trivia / teasers / patterns (`data/games`, `GamesPage`) + challenge system (`lib/games/challenges.js`).
- Games gated to Pro/team members. Games hub has a **Live multiplayer** section (trivia + chess).

### Legend Mode
- `lib/ai.js generateLearningContent` — riddles/metaphor/poem/story/hack/cyber/code/legend + strictness.
- `LegendModePage` (`/legend`).

### Social & referrals
- Study partners, friend chat, study rooms (search + WhatsApp invite), school community (`/community`, `lib/schoolCommunity.js`), feed, leaderboard, presence.
- Friend referral share (`lib/friendShare.js`, `SharePage` `/share/:id`, `ShareButton`): share → sign in → auto study-partner → chat.
- Partner/referral codes for schools (`lib/partner.js`).

### Intelligence
- Learning patterns (`lib/learningPatterns.js`) tracked on every session; shown in Admin Analytics.
- Learning loop countermeasures (`lib/learningLoop.js`) on dashboard.
- AI memory (`aiMemory.js`), sessions (`aiSessions.js`), training data (`aiTraining.js`).

### Admin
- Tabs: Activity, Payments, Users, Pro, Landing Media, Teams, Content, Compliance, Training, Teachers, Developer, Branding, Analytics, AI Usage, **Messages**, **Management**, **Diagnostics**, **Homepage**.
- Diagnostics: health checks, auto-fix (cache clear), backup/restore (JSON).
- Messages: warnings/maintenance/announcement with countdown.
- Homepage: edit hero slides (scene/eyebrow/title/body/buttons), add/remove slides, toggle sections, publish (`siteContent/homepage`).
- Branding: text + **background theme presets** + custom URL. Uploads: **50MB max** (storage rule).
- Dev settings: API keys, model override, maintenance mode, feature flags, **custom variables**.

### Homepage
- `HeroCarousel` (3 animated SVG scenes + rotated content + **live phone question simulation**).
- `LandingStats`, Bento, `WhatsNew` (animated feature clips), `EduClips` (4 micro-lessons), `LandingGames`, testimonials, pricing, FAQ.
- Section visibility controlled by admin (`siteContent/homepage.sections`).

### Sync
- `lib/sync.js` smart 72h sync (only when activity); `/api/cron/sync` daily; `syncMarkers` collection.

---

## 3. Key files map

```
src/
  App.jsx                      routes + guards
  context/AuthContext.jsx      auth, signup (accountType, schoolCode), smart sync
  lib/
    roles.js                   role helpers
    schools.js                 classes, invites, teacher classes
    teacherInvites.js          teacher invite codes
    management.js              management account creation (server endpoint) + CRUD
    schoolCommunity.js         community groups + AI-assisted chat
    friendShare.js             share items + friend referral redemption
    parentComments.js          teacher↔parent threads
    learningPatterns.js        per-user learning pattern tracking
    sync.js                    72h smart sync
    homepageContent.js         admin homepage slides + section toggles
    branding.js                branding + BACKGROUND_PRESETS
    games/chessEngine.js       minimax AI (10 levels)
    games/chessMultiplayer.js  live rooms
    games/chessResults.js      shareable result cards
    games/challenges.js        account-vs-account challenges
    ai.js                      AI calls, guide, legend content
  pages/
    ManagementPage.jsx         school-scoped management dashboard
    ChessPage.jsx              vs AI
    ChessRoomPage.jsx          multiplayer
    ChessResultPage.jsx        public result card
    SharePage.jsx              public shared item (referral)
    GamesPage.jsx              trivia/teasers/patterns + challenges
    LegendModePage.jsx         content styles
    CommunityPage.jsx          school community + groups
    schools/TeacherDashboard.jsx
  components/
    Admin*.jsx                 admin tabs
    ShareButton.jsx
    Scratchpad.jsx             movable rough-work + calculator
    landing/HeroCarousel.jsx, WhatsNew.jsx, EduClips.jsx, LandingGames.jsx
api/
  server.js                    mounts all /api routes
  _create-teacher.js           Admin SDK teacher creation
  _create-management.js        Admin SDK management creation (school-gated)
  _sync-cron.js                72h sync cron
  _class-invite.js, _room-answer.js, _verify-payment.js, _paystack-webhook.js, ...
```

---

## 4. Firestore collections (new this cycle)

`communityGroups`, `communityMembers`, `userGroups`, `managementAccounts`, `adminMessages`, `learningPatterns`, `parentThreads`, `syncMarkers`, `gameChallenges`, `chessRooms`, `chessResults`, `sharedItems`, `triviaRooms`, `siteContent/homepage`.

---

## 5. Where we stopped / next plans

**Completed this cycle:** teacher separation + independent workspace, teacher entry buttons, no teacher buttons for students, chess multiplayer + shareable results, friend-referral share flow, management-via-school flow + management dashboard, background presets, 50MB upload, admin custom variables, homepage carousel + edu clips + phone sim, CSV spreadsheets, docs, hero background video upload, live multiplayer trivia rooms, official Teacher Portal (separate signup/login/Google), student→teacher blocked, admin teacher account management.

**Next (not yet done):**
1. Server-side admin verification on `/api/create-teacher` (currently no caller-auth check — mirror `_create-management`).
2. Deploy Firestore + Storage rules (`firebase deploy --only firestore:rules,storage`).
3. Full lint cleanup (repo has pre-existing lint errors; build is the gate).
4. Learning-pattern → personalised recommendations surfaced on dashboard (data exists; UI minimal).
5. More school-scoped management actions (approve sub-schools) if required.
6. Automated tests for referral + chess flows.

---

## 6. Variables on the ground (must not assume missing)

- `VITE_FIREBASE_*` (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId) — required.
- `VITE_ADMIN_UIDS` (optional) — extra admins by uid.
- `VITE_SEED_ADMIN_EMAIL` / `VITE_SEED_ADMIN_PASSWORD` (optional) — admin auto-seed.
- Server env: `ADMIN_UIDS`, `CRON_SECRET`, Paystack + Firebase Admin creds.
- Local storage keys: `exampadi_landing_media`, `exampadi_homepage_content`, `ep_partner_ref`, `ep_friend_ref`, `exampadi_last_sync`, `ep_leaderboard_cache`, `ep_scratchpad_*`.
- `siteContent/homepage` = `{ slides[], sections{} }`; `siteContent/branding` = branding doc; `siteContent/landing` = media slots.

---

## 7. Resume checklist

1. `git pull` (or check `git status`).
2. `npm run build` → must pass (question validation + env).
3. Read section 5 "next plans".
4. After changes: build, commit with a clear message, push.
5. If rules changed: remind to `firebase deploy --only firestore:rules,storage`.
