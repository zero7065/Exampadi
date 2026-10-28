// api/paystack-webhook.js
// Vercel serverless function — Paystack webhook handler.
// Signature must be computed over the RAW request body, so body parsing is
// disabled (see `config` export) and the stream is read manually.

import crypto from "crypto";
import { recordCommission } from "./_commission.js";
import { getFirebase } from "./_firebase.js";
import { endDateFor, isTeamPlan, isPackPlan, AI_PACK_MESSAGES } from "./_plans.js";
import { provisionTeam } from "./_provision.js";

export const config = {
  api: { bodyParser: false },
};

function readRawBody(req) {
  if (req.rawBody) return Promise.resolve(req.rawBody);
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) reject(new Error("Body too large"));
    });
    req.on("end", () => resolve(Buffer.from(data, "utf8")));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    console.error("[webhook] PAYSTACK_SECRET_KEY not set");
    return res.status(500).json({ error: "Server misconfigured" });
  }

  let raw;
  try {
    raw = await readRawBody(req);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const hash = crypto
    .createHmac("sha512", secretKey)
    .update(raw)
    .digest("hex");

  const provided = req.headers["x-paystack-signature"];
  if (!provided || hash !== provided) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  let event;
  try {
    event = JSON.parse(raw.toString("utf8"));
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  if (event.event === "charge.success") {
    const data = event.data || {};
    const reference = data.reference || null;
    const metadata = data.metadata || {};
    const userId = metadata.userId || metadata.uid || null;
    const plan = metadata.plan || null;
    const amountMinor = Number(data.amount || 0);

    console.log(
      `[webhook] charge.success ref=${reference} user=${userId} plan=${plan} amount=${amountMinor} ${data.currency || ""}`
    );

    const fb = getFirebase();
    const db = fb ? fb.db : null;
    if (db && userId && plan && reference && amountMinor > 0) {
      const adminLib = fb.admin;
      const isTeam = isTeamPlan(plan);
      const isPack = isPackPlan(plan);
      try {
        await db.collection("payments").doc(reference).set(
          {
            reference,
            userId,
            plan,
            amount: amountMinor / 100,
            currency: data.currency || "NGN",
            event: event.event,
            webhookVerified: true,
            createdAt: new Date(),
          },
          { merge: true }
        );
        // Partner Plan: commission for any paid plan (idempotent by ref).
        // Use the NGN base from metadata (client always sends the NGN price);
        // fall back to the raw amount only for NGN charges so USD/GHS/KES/ZAR
        // payments don't get commissions computed on the foreign amount.
        if (metadata.partnerCode) {
          const ngnBase = Number(metadata.amountNaira) > 0
            ? Number(metadata.amountNaira)
            : ((data.currency || "NGN") === "NGN" ? amountMinor / 100 : 0);
          await recordCommission(adminLib, db, {
            reference,
            userId,
            plan,
            ngn: ngnBase,
            partnerCode: metadata.partnerCode,
          });
        }
        if (isTeam) {
          // Provision the classroom server-side so the school's purchase is
          // never lost if the client never reopens the tab. Idempotent.
          await provisionTeam(adminLib, db, {
            teamId: metadata.teamId || null,
            userId,
            userEmail: metadata.userEmail || (data.customer && data.customer.email) || null,
            plan,
            seats: metadata.seats,
            reference,
            ngn: Number(metadata.amountNaira) > 0 ? Number(metadata.amountNaira) : amountMinor / 100,
          });
        } else if (isPack) {
          await db.collection("users").doc(userId).set(
            { aiPackCredits: adminLib.firestore.FieldValue.increment(AI_PACK_MESSAGES) },
            { merge: true }
          );
        } else {
          await db.collection("users").doc(userId).set(
            {
              subscription: {
                plan,
                status: "active",
                reference,
                startDate: new Date().toISOString(),
                endDate: endDateFor(plan).toISOString(),
                autoRenew: true,
                verified: true,
                webhookVerified: true,
              },
            },
            { merge: true }
          );
        }
      } catch (e) {
        console.error("[webhook] write failed:", e?.message);
        return res.status(500).json({ error: "Write failed" });
      }
    }
  }

  return res.status(200).json({ received: true });
}
