// api/server.js — consolidated Express server for all Vercel API routes.
// Mounts every api/*.js handler under its traditional /api/* path,
// so existing client URLs continue to work unchanged.
// This replaces 17+ individual serverless functions with 1.

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

// --- Utility imports (kept as modules, not functions) ---
import "./_firebase.js";          // Firebase Admin SDK
import "./_auth.js";              // requireUser, parseBody, cors helpers
import "./_commission.js";        // recordCommission
import "./_plans.js";             // plan constants, endDateFor, isTeamPlan, isPackPlan
import "./_provision.js";         // provisionTeam

// --- Route handlers (each is a named import of the default export) ---
import health from "./health.js";
import ai from "./ai.js";
import verifyPayment from "./verify-payment.js";
import paystackWebhook from "./paystack-webhook.js";
import classInvite from "./class-invite.js";
import gradeAssignment from "./grade-assignment.js";
import generateTeacherCode from "./generate-teacher-code.js";
import redeemTeacherCode from "./redeem-teacher-code.js";
import redeemTeacherInvite from "./redeem-teacher-invite.js";
import notify from "./notify.js";
import roomAnswer from "./room-answer.js";
import image from "./image.js";
import reminders from "./reminders.js";
import surveyVote from "./survey-vote.js";

// --- Express app ---
const app = express();

// Global CORS (each handler also sets its own, this is a safety net)
app.use(cors({ origin: "*", methods: ["GET", "POST", "OPTIONS"], allowedHeaders: ["Content-Type", "Authorization"] }));

// Global JSON body parser (paystack-webhook will override this with raw body)
app.use(bodyParser.json());

// --- Route: GET /api/health ---
app.get("/api/health", async (req, res) => {
  await health(req, res);
});

// --- Route: POST /api/ai ---
app.post("/api/ai", async (req, res) => {
  await ai(req, res);
});

// --- Route: POST /api/verify-payment ---
app.post("/api/verify-payment", async (req, res) => {
  await verifyPayment(req, res);
});

// --- Route: POST /api/paystack-webhook (no JSON body parser) ---
app.post("/api/paystack-webhook", async (req, res) => {
  // Body already parsed as raw Buffer by readRawBody inside the handler
  await paystackWebhook(req, res);
});

// --- Route: POST /api/class-invite ---
app.post("/api/class-invite", async (req, res) => {
  await classInvite(req, res);
});

// --- Route: POST /api/grade-assignment ---
app.post("/api/grade-assignment", async (req, res) => {
  await gradeAssignment(req, res);
});

// --- Route: POST /api/generate-teacher-code ---
app.post("/api/generate-teacher-code", async (req, res) => {
  await generateTeacherCode(req, res);
});

// --- Route: POST /api/redeem-teacher-code ---
app.post("/api/redeem-teacher-code", async (req, res) => {
  await redeemTeacherCode(req, res);
});

// --- Route: POST /api/redeem-teacher-invite ---
app.post("/api/redeem-teacher-invite", async (req, res) => {
  await redeemTeacherInvite(req, res);
});

// --- Route: POST /api/notify ---
app.post("/api/notify", async (req, res) => {
  await notify(req, res);
});

// --- Route: POST /api/room-answer ---
app.post("/api/room-answer", async (req, res) => {
  await roomAnswer(req, res);
});

// --- Route: POST /api/image ---
app.post("/api/image", async (req, res) => {
  await image(req, res);
});

// --- Route: POST /api/reminders ---
app.post("/api/reminders", async (req, res) => {
  await reminders(req, res);
});

// --- Route: POST /api/survey-vote ---
app.post("/api/survey-vote", async (req, res) => {
  await surveyVote(req, res);
});

// Fallback 404 for any unmatched /api/* paths
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: "API route not found" });
});

export default app;

// For Vercel: the default export is the serverless function handler
// Vercel auto-detects the exported `handler` when the file is named
// `api/server.js` — it wraps the Express app as a serverless function.