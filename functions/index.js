const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

exports.paystackWebhook = onRequest(
  { secrets: ["PAYSTACK_SECRET_KEY"] },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const signature = req.headers["x-paystack-signature"];
    if (!signature || !PAYSTACK_SECRET) {
      logger.warn("Missing signature or secret key");
      res.status(401).send("Unauthorized");
      return;
    }

    const hash = crypto
      .createHmac("sha512", PAYSTACK_SECRET)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== signature) {
      logger.warn("Invalid webhook signature");
      res.status(401).send("Unauthorized");
      return;
    }

    const event = req.body;
    logger.info(`Paystack event: ${event.event}`, { reference: event.data?.reference });

    if (event.event === "charge.success") {
      const { reference, metadata, amount } = event.data;

      // Parse metadata from both formats:
      // 1. Top-level keys: { userId, plan } — used by usePaystack.js hook
      // 2. custom_fields array: [{ variable_name, value }] — used by paystack.js / PaymentPage
      let userId = metadata?.userId;
      let plan = metadata?.plan;

      if (!userId || !plan) {
        const fields = metadata?.custom_fields || [];
        userId = userId || fields.find(f => f.variable_name === "user_uid")?.value;
        plan = plan || fields.find(f => f.variable_name === "plan_id")?.value;
      }

      if (!userId || !plan || !reference) {
        logger.error("Missing userId, plan, or reference in webhook payload", { metadata: JSON.stringify(metadata) });
        res.status(400).send("Bad Request");
        return;
      }

      const now = admin.firestore.Timestamp.now();
      const isYearly = String(plan).includes("yearly") || plan === "proYearly";
      const endDate = isYearly
        ? new Date(now.toDate().setFullYear(now.toDate().getFullYear() + 1))
        : new Date(now.toDate().setMonth(now.toDate().getMonth() + 1));

      try {
        await db.runTransaction(async (tx) => {
          const paymentRef = db.collection("payments").doc(reference);
          tx.set(paymentRef, {
            userId,
            reference,
            plan,
            amount: amount / 100,
            status: "verified",
            verifiedAt: now,
            paystackReference: reference,
            teamId: metadata?.teamId || null,
          });

          // Team purchase? Activate the team (payer gets first seat).
          if (metadata?.teamId) {
            const teamRef = db.collection("teams").doc(metadata.teamId);
            const teamSnap = await tx.get(teamRef);
            if (teamSnap.exists && teamSnap.data().status !== "active") {
              const team = teamSnap.data();
              const teamYearly = String(team.plan).includes("yearly");
              const expiry = teamYearly
                ? new Date(now.toDate().setFullYear(now.toDate().getFullYear() + 1))
                : new Date(now.toDate().setMonth(now.toDate().getMonth() + 1));
              tx.update(teamRef, {
                status: "active",
                reference,
                amountPaid: amount / 100,
                activatedAt: now,
                members: admin.firestore.FieldValue.arrayUnion(userId),
                seatsUsed: admin.firestore.FieldValue.increment(1),
              });
              tx.update(db.collection("users").doc(userId), {
                subscription: {
                  plan, status: "active", reference,
                  startDate: now,
                  endDate: admin.firestore.Timestamp.fromDate(expiry),
                  autoRenew: false, viaTeam: metadata.teamId,
                  webhookVerified: true, verifiedAt: now,
                },
                teamIds: admin.firestore.FieldValue.arrayUnion(metadata.teamId),
              });
            }
            logger.info(`Team payment verified for team ${metadata.teamId}`, { reference, plan });
            res.status(200).json({ status: "verified-team" });
            return;
          }

          const userRef = db.collection("users").doc(userId);
          tx.update(userRef, {
            subscription: {
              plan,
              status: "active",
              reference,
              startDate: now,
              endDate: admin.firestore.Timestamp.fromDate(endDate),
              autoRenew: true,
              webhookVerified: true,
              verifiedAt: now,
            },
          });
        });

        logger.info(`Payment verified for user ${userId}`, { reference, plan });
        res.status(200).json({ status: "verified" });
      } catch (err) {
        logger.error("Transaction failed", err);
        res.status(500).send("Internal Server Error");
      }
    } else {
      res.status(200).json({ status: "ignored" });
    }
  }
);

// ─── Scheduled purge: hard-delete accounts past their 30-day grace period ───
// Runs daily at 02:00 Africa/Lagos. Deletes users/{uid}, all per-user docs in
// sessions/mockExams/notes/activityLog/feedback, aiMemory/{uid},
// studyPlans/{uid}, and the avatar file.
exports.purgeDeletedAccounts = onSchedule(
  { schedule: "0 2 * * *", timeZone: "Africa/Lagos" },
  async () => {
    const cutoff = new Date().toISOString();
    const usersSnap = await db.collection("users").get();
    let purged = 0;

    for (const userDoc of usersSnap.docs) {
      const data = userDoc.data();
      if (!data.deletedAt || !data.deletionScheduledAt) continue;
      if (data.deletionScheduledAt > cutoff) continue;

      const uid = userDoc.id;
      try {
        const batch = db.batch();
        batch.delete(userDoc.ref);

        for (const col of ["sessions", "mockExams", "notes", "activityLog", "feedback"]) {
          const snap = await db.collection(col).where("userId", "==", uid).get();
          snap.forEach((d) => batch.delete(d.ref));
        }
        batch.delete(db.doc(`aiMemory/${uid}`));
        batch.delete(db.doc(`studyPlans/${uid}`));
        await batch.commit();

        try {
          await admin.storage().bucket().file(`avatars/${uid}/profile.jpg`).delete();
        } catch {
          // file may not exist — not fatal
        }

        logger.info(`Purged deleted account ${uid}`);
        purged++;
      } catch (err) {
        logger.error(`Purge failed for ${uid}`, err);
      }
    }

    logger.info(`purgeDeletedAccounts complete: ${purged} account(s) purged`);
  }
);
