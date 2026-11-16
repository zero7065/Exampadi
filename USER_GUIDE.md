# ExamPadi — User Guide

Everything a student, teacher or school manager needs to navigate and use ExamPadi.
(Admin-only data and tools are intentionally excluded from this guide.)

---

## 1. Getting started

1. Open the home page → **Start Free** (or **Sign In**).
2. Create an account with email + password **or** continue with **Google**.
3. Choose **I'm a Student** or **I'm a Teacher** at signup.
4. Onboarding: pick your exam (JAMB / WAEC / NECO / NABTEB / POST-UTME / IELTS / SAT) and your subjects.
5. Land on your **Dashboard**.

> Tip: you can add a school code during signup (from your teacher/school) to auto-join your school.

---

## 2. Navigation overview

Desktop uses the left sidebar; mobile uses the bottom bar + **More** sheet.

| Section | Pages |
|---|---|
| **Home** | Dashboard, Stats, Progress, History |
| **Learn** | Practice, Exam Mode (CBT), Mock Exam, Past Questions, Question Bank, Flashcards, Study Plan |
| **AI & Insights** | AI Tutor, Legend Mode, Mastery |
| **Community** | School Community, Leaderboard, Feed, Study Room, Games, Partners |
| **Pro Tools** | Notepad, Assignments |
| **Account** | Help, Contact, Profile, Settings |

---

## 3. Studying

- **Practice** (`/select` → `/practice`): pick subject + mode (free / timed / CBT), answer questions, get instant AI explanations.
- **Exam Mode / CBT** (`/cbt`): full-screen timed exam with a question palette, flags, and a movable **Scratchpad + calculator**.
- **Mock Exam** (`/mock-exam`): full-length timed simulation with instant scoring and breakdowns.
- **Question Bank** (`/question-bank`): browse and filter 1,594 real questions; expand for the answer + explanation; **Share** any question; export the bank as **CSV**.
- **Flashcards** and **Study Plan** (`/flashcards`, `/study-plan`): spaced review and an AI-generated day-by-day plan (download it as a **CSV timetable**).
- **Reference Library** (`/reference`): formula sheets, books & tools, and the **Learning Feed** (news) + **Video Lessons**.

### Limits by plan

| | Free | Pro |
|---|---|---|
| Questions / day | 15 | Unlimited |
| AI tutor messages / day | 3 | 150–250 / month |
| Subjects | 2 | All |
| Mock exams | — | ✓ |
| Games / Chess / Legend Mode | — | ✓ |

---

## 4. Subscriptions

- Upgrade on `/payment` (Paystack). Pro Monthly, Pro Yearly, IELTS, and team/classroom plans.
- Team/classroom plans give Pro to every member who redeems your team code.
- Schools: students get Pro after a verified payment **or** admin/management override.

---

## 5. Social & community

- **Study Partners** (`/study-partners`): add a friend by **User ID**, open a **Study Room**, schedule shared tests. (Pro)
- **Friend chat** (`/friends/chat/:pairId`): 1:1 messages + share questions.
- **School Community** (`/community`): your school's private group chat with **AI assist**. Students and teachers are in the same community with role badges. Create student sub‑groups (Study / Gist / Games / Q&A).
- **Feed** (`/feed`): top students, public help board.

### Sharing a challenge (referral)

Share a question, brain teaser, or chess challenge to WhatsApp (or any app). When a friend opens the link:

1. They see the challenge on `/share/:id`.
2. They **sign in with Google**.
3. They're **automatically added as your study partner** and can start chatting with you.

---

## 6. Games & Legend Mode

- **Games** (`/games`): Trivia, Brain Teasers, Patterns, Chess. Share any teaser/trivia as a challenge.
- **Chess** (`/games/chess`): play vs AI across **10 levels** (Beginner → Grandmaster).
  - **Play a friend** (`/chess/room`): create a room with **Unlimited / 5‑min / custom** time control, share the code or WhatsApp invite, play live.
  - Finished games become a shareable **result card** (`/chess/result/:id`) — "Can you beat this?"
- **Legend Mode** (`/legend`): learn a topic through **riddles, metaphors, poems, stories, edu‑hacks, cyber/dev lenses**, with **Gentle / Balanced / Strict (Legend)** strictness.

---

## 7. Profile & progress

- **Profile** (`/profile`): avatar, display name, **bio**, copyable **User ID / @username** (how friends find you), public-profile toggle.
- **Streaks & achievements**: your daily streak and unlocked badges persist on your profile and show on the dashboard. View all on `/progress`.

---

## 8. For teachers

You can be a **teacher** two ways:

1. **Independent teacher** — sign up and choose **I'm a Teacher**. You immediately get your own teacher workspace (no school required).
2. **School teacher** — a school issues a **teacher login code**; redeem it at `/teacher/register`.

**Teacher Dashboard** (`/teacher`):

- **Classes** — create, name, pick subject; each class gets an **invite code**.
- **Students** — invite students with the code (they join at `/join`); see the roster, leaderboard, topic heatmap, weak topics.
- **Assignments** — send to the whole class with a deadline; grade and re-grade from **Reviews** (`/teacher/reviews`).
- **Lesson plans** — AI-generated or manual (`/teacher/exam-generator` generates PDF exams).
- **Classroom mode** (`/teacher/classroom`) — live session, polls, attention requests, announcements.
- **Parent reports** (`/teacher/parent-reports`).

> Teachers and students are **separate experiences**. Students never see a Teacher button; teachers never see student-only clutter.

---

## 9. For schools & management

1. **Register the school** at `/schools/signup` (school name, contact, details).
2. An admin **approves** it. Approval generates the school's **teacher login code(s)**.
3. A **management login** is created for the school (email + temp password). Management is created **only for a registered, approved school**.
4. **Management dashboard** (`/management`) — school-scoped:
   - Students / teachers / classes counts.
   - **Pull sync** (smart — only when there's new activity).
   - **Community** (school group chat).
   - Fully isolated — management never sees other schools or other admins.
5. **Teachers** redeem the teacher code; **students** join with the school/class code.

---

## 10. Account & support

- **Settings** (`/settings`): exams, learning style, notifications, privacy, school code.
- **Help** (`/help`): full feature guide, replay the tour, guide assistant.
- **Contact** (`/contact`): WhatsApp / email support.
