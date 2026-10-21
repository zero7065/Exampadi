# ExamPadi — Implementation & Deployment Guide

This guide covers every step needed to run, deploy, and verify the current build.
It assumes the repository is already cloned at `C:\Users\Stylez\Downloads\jamb ai tutor`.

---

## 1. Local setup

1. Open PowerShell in the project folder.
2. Install dependencies (first run only):
   ```powershell
   npm install
   ```
3. Create `.env.local` from the template:
   ```powershell
   Copy-Item .env.example .env.local
   ```
4. Fill in the Firebase web config values and any optional client keys.
   Never put `GROQ_API_KEY`, `FIREBASE_SERVICE_ACCOUNT`, or `PAYSTACK_SECRET_KEY`
   in a `VITE_` variable — those are server-only.
5. Start the app:
   ```powershell
   npm run dev
   ```
6. Open `http://localhost:5173`.

### Build locally
```powershell
if (Test-Path -LiteralPath "dist") { Remove-Item -LiteralPath "dist" -Recurse -Force }
npm run build
```
`prebuild` validates environment variables and the question bank. A successful
build ends with `✓ built in ...`.

---

## 2. Firebase project setup

Project: `jamb-tutor`  
Console: https://console.firebase.google.com/project/jamb-tutor/overview

### 2.1 Authentication
1. Firebase Console → **Build → Authentication → Sign-in method**.
2. Enable **Email/Password** and **Google**.
3. Authentication → **Settings → Authorized domains**.
4. Add:
   - `localhost`
   - `exampadi.vercel.app`
   - your custom domain, if one is connected
5. Authentication → **Users** → confirm `jadai7065@gmail.com` exists.
6. In Firestore, set that user document's `role` to `"admin"`.

### 2.2 Firestore
1. Firebase Console → **Build → Firestore Database**.
2. Use the default database in production mode.
3. Rules and indexes in this repo are already deployed:
   ```powershell
   firebase deploy --only firestore:rules --project jamb-tutor --non-interactive
   firebase deploy --only firestore:indexes --project jamb-tutor --non-interactive
   ```
4. Re-run both commands after any future change to `firestore.rules` or
   `firestore.indexes.json`.
5. Wait for new composite indexes to finish building in
   **Firestore → Indexes** before testing queries that need them.

### 2.3 Service account for Vercel APIs
1. Firebase Console → **Project settings → Service accounts**.
2. Click **Generate new private key**.
3. Copy the entire JSON object into the Vercel environment variable
   `FIREBASE_SERVICE_ACCOUNT` (Production and Preview).
4. Never commit the JSON file.

### 2.4 Free-plan limits
- Firebase Storage is **not enabled** on the free plan. Whiteboard saves use
  vector strokes and compressed thumbnails in Firestore.
- Cloud Functions are not used. Server work runs in Vercel `api/*.js`.
- Cloud Messaging is free, but web push needs a VAPID key (see section 4).
- Firestore free quotas apply; avoid large base64 images in documents.

---

## 3. Groq API key (AI tutor)

The browser never receives the Groq key. It calls `/api/ai`, which reads
`GROQ_API_KEY` from the Vercel server environment.

### 3.1 Update the key
1. Open https://console.groq.com/keys and create or copy the key.
2. Open the Vercel project → **Settings → Environment Variables**.
3. Edit `GROQ_API_KEY` for **Production** and **Preview**.
4. Paste the new value and save.
5. Redeploy so the new environment is loaded:
   ```powershell
   vercel --prod
   ```
   Environment changes do not affect an already-running deployment until a new
   deployment is created.

### 3.2 Verify the app is using it
1. Open:
   ```
   https://exampadi.vercel.app/api/health
   ```
2. Confirm:
   ```json
   { "services": { "groq": true }, "aiReady": true }
   ```
3. Sign in to the app, open the AI Tutor, and send one message.
4. If it fails:
   - `NO_AI_KEY` → the key is missing from the current Vercel environment.
   - `AUTH_REQUIRED` / `AUTH_INVALID` → sign in again.
   - `Unknown model` → the model list in `src/lib/ai.js` and
     `api/ai.js` must match the models available to the key.
   - `401` from Groq → the key is invalid or revoked.
5. To list models available to the key without exposing it:
   ```powershell
   $key = Read-Host "Groq key"
   Invoke-RestMethod -Uri "https://api.groq.com/openai/v1/models" -Headers @{ Authorization = "Bearer $key" } |
     Select-Object -ExpandProperty data |
     Select-Object id
   ```
6. If the model list differs, update **both**:
   - `src/lib/ai.js` → `MODELS`
   - `api/ai.js` → `ALLOWED_MODELS`
   - `src/lib/vision.js` → `VISION_MODEL` (must support images)

### 3.3 Free AI limits
Free users get the daily limit defined in `src/config/plans.js`. The server
enforces the limit in `api/ai.js`; the client display is only a convenience.

---

## 4. Web push notifications

1. Firebase Console → **Project settings → Cloud Messaging**.
2. Under **Web configuration → Web Push certificates**, click
   **Generate key pair** (or use the existing pair).
3. Copy the **public** key. This is safe to expose in the browser; never copy
   the Firebase private key or service-account JSON here.
4. Local: open `.env` and set:
   ```env
   VITE_FIREBASE_VAPID_KEY=YOUR_PUBLIC_VAPID_KEY
   ```
5. Vercel: **Project → Settings → Environment Variables → Add New**.
   - Key: `VITE_FIREBASE_VAPID_KEY`
   - Value: the same public key
   - Environments: **Production** and **Preview**
6. Save, then redeploy so the new client bundle is built:
   ```powershell
   vercel --prod
   ```
7. Open the app, sign in, open the notification bell, and click
   **Enable notifications**.
8. On iPhone/iPad:
   - iOS 16.4 or newer is required.
   - Safari → Share → **Add to Home Screen**.
   - Open the installed app, then enable notifications.
9. Push is best-effort on the free plan. In-app notifications always work
   through the `notifications` collection and `NotificationPanel`.
10. If `Enable notifications` does nothing, confirm the key starts with `B`
    and that the deployed bundle contains the value after redeploying.

---

## 5. Vercel deployment

Project: `exampadi`  
Production URL: https://exampadi.vercel.app

### 5.1 Required environment variables
| Variable | Scope | Purpose |
| --- | --- | --- |
| `VITE_FIREBASE_API_KEY` | Client | Firebase web config |
| `VITE_FIREBASE_AUTH_DOMAIN` | Client | Firebase web config |
| `VITE_FIREBASE_PROJECT_ID` | Client | Firebase web config |
| `VITE_FIREBASE_STORAGE_BUCKET` | Client | Firebase web config |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Client | Firebase web config |
| `VITE_FIREBASE_APP_ID` | Client | Firebase web config |
| `VITE_FIREBASE_MEASUREMENT_ID` | Client | Analytics (optional) |
| `VITE_FIREBASE_VAPID_KEY` | Client | Web push |
| `VITE_PAYSTACK_PUBLIC_KEY` | Client | Paystack checkout |
| `GROQ_API_KEY` | Server | AI tutor |
| `FIREBASE_SERVICE_ACCOUNT` | Server | Token verification + APIs |
| `GEMINI_API_KEY` | Server | Image features (optional) |
| `HF_API_KEY` | Server | Image fallback (optional) |
| `PAYSTACK_SECRET_KEY` | Server | Payment verification |

### 5.2 Deploy
```powershell
vercel --prod
```
Or connect the GitHub repository and let Vercel deploy on every push to `main`.

### 5.3 Verify
1. Open https://exampadi.vercel.app.
2. Open `/api/health` and confirm `aiReady: true`.
3. Sign in, open the AI Tutor, and send a message.
4. Confirm the domain shown in the browser is `exampadi.vercel.app`.
5. If a custom domain points at an old deployment, remove the old alias in
   Vercel → **Settings → Domains**, then add it to the current project.

### 5.4 Paystack production key
`/api/health` reports `paystack: false` until Vercel sees the server key.

1. Vercel → **Project → Settings → Environment Variables**.
2. Confirm the exact name is `PAYSTACK_SECRET_KEY` (not `VITE_PAYSTACK_SECRET_KEY`).
3. Enable **Production** and **Preview**.
4. Redeploy:
   ```powershell
   vercel --prod
   ```
5. Re-open `/api/health` and confirm `paystack: true`.
6. The public checkout key stays in `VITE_PAYSTACK_PUBLIC_KEY`; the secret key
   must never be prefixed with `VITE_`.

---

## 6. Feature walkthrough

### Student
1. Sign up or sign in.
2. Dashboard → **Practice** → choose a subject and topic.
3. **Mock Exam** → start an exam → submit → review explanations.
4. **AI Tutor** → ask a question → use **Save to notepad** or **Remind me**.
5. **Assignments** (`/assignments`) → open an assignment → answer → submit.
6. **Classroom** → join with a class code → chat, discussions, whiteboard.
7. **Notifications** → bell in the navbar or bottom navigation.
8. **PWA** → install from the browser prompt or iOS Share menu.

### Teacher
1. Sign in with a teacher account.
2. **Teacher Dashboard** → create a class.
3. Share the class code or invite link.
4. **Assignments** → choose class, subject, questions, due date → publish.
   Answer keys are stored in `teacherAssignments/{id}/key` and are never sent
   to students.
5. **Reviews** (`/teacher/reviews`) → open a student review request → reply.
6. Classroom → start a live session → students join.

### Admin
1. Sign in with the admin account.
2. Open `/admin`.
3. Check **System Health** for Groq, Firebase Admin, Gemini, and Paystack flags.
4. Review reported questions and users.

### Public demo
1. Open `/demo` without signing in.
2. Answer the three sample questions.
3. Use the sign-up call-to-action to create an account.

---

## 7. Pricing layout verification

The pricing section was rewritten to avoid collapsed cards on small screens.

1. Open the landing page and scroll to **Pricing**.
2. Test at these widths:
   - 1440px: three cards in one row.
   - 1024px: three cards in one row.
   - 980px and below: two cards per row, third card centered.
   - 620px and below: one card per row.
3. Confirm:
   - No card overlaps or shrinks below readable width.
   - The popular card is not shifted upward on tablet/mobile.
   - Naira prices render as `₦`, not mojibake.
   - Every CTA navigates to `/signup`, `/pricing`, or the correct auth page.
4. If text appears garbled only in PowerShell, that is a console encoding issue;
   the files are UTF-8.

---

## 8. Commit and push

1. Review changes:
   ```powershell
   git status
   git diff --stat
   ```
2. Build once more:
   ```powershell
   npm run build
   ```
3. Stage and commit:
   ```powershell
   git add -A
   git commit -m "feat: finish classroom, assignments, notifications, pricing, and deployment fixes"
   ```
4. Push to GitHub:
   ```powershell
   git push origin main
   ```
5. If Git asks for credentials, use the GitHub username and a personal access
   token with `repo` scope. Do not save the token into a tracked file.
6. After the push, confirm the Vercel deployment for `main` succeeds.

---

## 9. Smoke-test checklist

- [ ] `/` loads in dark and light themes.
- [ ] Pricing cards are readable at 375px, 768px, 1024px, and 1440px.
- [ ] `/demo` works without auth and its buttons are styled.
- [ ] Sign-up, sign-in, and Google sign-in work.
- [ ] Refresh keeps the user signed in.
- [ ] AI Tutor returns a reply and books usage.
- [ ] `/api/health` reports `aiReady: true`.
- [ ] Notifications panel opens on desktop and mobile.
- [ ] Enable-notifications button does not throw.
- [ ] Student can open `/assignments` without a Pro gate.
- [ ] Teacher can create an assignment and a student can submit it.
- [ ] Teacher can open `/teacher/reviews` and reply.
- [ ] Classroom chat, discussion, and whiteboard save.
- [ ] Admin dashboard loads health flags.
- [ ] PWA manifest and icons load; install prompt appears.
- [ ] No console errors on the pages above.

---

## 10. Troubleshooting

### `npm run build` fails with `ENOTEMPTY`
```powershell
Remove-Item -LiteralPath "dist" -Recurse -Force
npm run build
```

### Firestore `Missing or insufficient permissions`
- Confirm the latest rules are deployed.
- Confirm the user document has the expected `role`.
- Confirm the class document contains the user in `studentIds` or `teacherIds`.
- Re-deploy:
  ```powershell
  firebase deploy --only firestore:rules --project jamb-tutor --non-interactive
  ```

### Firestore asks for an index
- Open the link in the browser console error.
- Or add the composite index to `firestore.indexes.json`, then deploy indexes.
- Wait for the index status to become **Enabled**.

### AI returns `NO_AI_KEY`
- The current deployment does not see `GROQ_API_KEY`.
- Re-check Vercel → Settings → Environment Variables.
- Redeploy with `vercel --prod`.

### AI returns `Unknown model`
- The model is not in the server allowlist or not available to the key.
- Run the model-list command in section 3.2 and align both model lists.

### Push notifications do not arrive
- Confirm `VITE_FIREBASE_VAPID_KEY` is set and the app was redeployed.
- Confirm the browser permission is **Allow**.
- On iOS, confirm the app is installed to the Home Screen and iOS ≥ 16.4.
- In-app notifications should still appear in the bell panel.

### Whiteboard upload fails
- Firebase Storage is disabled on the free plan.
- The app saves vector strokes and compressed thumbnails instead.
- Keep drawings small; avoid embedding large photos.

### Payments fail
- Set `PAYSTACK_SECRET_KEY` in Vercel and redeploy.
- Confirm the Paystack public key is present in the client config.
- Test with Paystack test keys before switching to live keys.

---

## 11. Useful commands

```powershell
# Local development
npm run dev

# Production build
npm run build

# Preview the production build
npm run preview

# Deploy Firebase rules
firebase deploy --only firestore:rules --project jamb-tutor --non-interactive

# Deploy Firebase indexes
firebase deploy --only firestore:indexes --project jamb-tutor --non-interactive

# Deploy the app to Vercel production
vercel --prod

# Check deployment health
Invoke-RestMethod https://exampadi.vercel.app/api/health

# Git status and push
git status
git add -A
git commit -m "your message"
git push origin main
```
