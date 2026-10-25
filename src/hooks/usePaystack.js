import { useState } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { apiUrl } from "../lib/apiBase";
import { PLANS, convertFromNGN } from "../config/plans";
import { openPaystack } from "../paystack";
import { useToast } from "../components/Toast";
import { useAuth } from "../context/AuthContext";

const PRO_PLANS = new Set(["pro_monthly", "pro_yearly", "ielts"]);
const YEARLY_PLANS = new Set(["pro_yearly", "ielts", "team_yearly"]);
const PACK_PLANS = new Set(["ai_pack_50"]);

export function rememberPaymentReference(reference, plan) {
  try {
    if (!reference) return;
    const prev = readLastPayment() || {};
    sessionStorage.setItem("ep_last_payment_ref", reference);
    sessionStorage.setItem(
      "ep_last_payment",
      JSON.stringify({ reference, plan: plan || prev.plan || null })
    );
  } catch (_) {}
}

export function readLastPayment() {
  try {
    const raw = sessionStorage.getItem("ep_last_payment");
    if (raw) return JSON.parse(raw);
    const ref = sessionStorage.getItem("ep_last_payment_ref");
    return ref ? { reference: ref, plan: null } : null;
  } catch (_) {
    return null;
  }
}

function successToast(plan) {
  if (PACK_PLANS.has(plan)) return "50 AI messages added to your balance.";
  if (plan === "team_monthly" || plan === "team_yearly") return "Classroom plan active. Share your team code with your students.";
  return "Pro activated! Welcome to ExamPadi Pro";
}

export function usePaystack() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();
  const { updateUser } = useAuth();

  function calculateEndDate(plan) {
    const now = new Date();
    if (YEARLY_PLANS.has(plan)) {
      now.setFullYear(now.getFullYear() + 1);
    } else {
      now.setMonth(now.getMonth() + 1);
    }
    now.setHours(23, 59, 59, 999);
    return now;
  }

  // Server-side verification against Paystack. Returns:
  //   { ok: true,  verified, activated, plan, ... }
  //   { ok: false, verified: false, error }          — server says NOT paid
  //   { unreachable: true }                          — our API could not be reached
  async function verifyOnServer(reference) {
    const attempts = [
      apiUrl(`/api/verify-payment?ref=${encodeURIComponent(reference)}`),
    ];
    for (const url of attempts) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        const type = res.headers.get("content-type") || "";
        if (!type.includes("application/json")) throw new Error("non-json");
        const data = await res.json();
        if (res.ok && data.ok) return { ok: true, ...data };
        if (res.ok === false || data.ok === false) {
          return { ok: false, verified: false, error: data.error || "Not verified" };
        }
        throw new Error("bad response");
      } catch (_) {
        // try next endpoint
      }
    }
    return { unreachable: true };
  }

  async function persistSubscription({ reference, plan, userId, verified }) {
    // Credit packs: top up the bonus pool, never touch subscription.
    if (PACK_PLANS.has(plan)) {
      if (db && userId) {
        const { increment } = await import("firebase/firestore");
        try {
          await updateDoc(doc(db, "users", userId), { aiPackCredits: increment(50) });
        } catch (e) {
          console.warn("AI pack write failed:", e?.code || e?.message);
        }
      }
      return null;
    }
    const endDate = calculateEndDate(plan);
    if (db && userId) {
      let retries = 3;
      while (retries > 0) {
        try {
          await updateDoc(doc(db, "users", userId), {
            subscription: {
              plan,
              status: "active",
              reference,
              startDate: serverTimestamp(),
              endDate: endDate.toISOString(),
              autoRenew: true,
              ...(verified ? { verified: true } : { pendingVerification: true }),
            },
          });
          break;
        } catch (e) {
          retries--;
          console.warn("Subscription write failed:", e?.code || e?.message);
          if (retries === 0) throw e;
          await new Promise((r) => setTimeout(r, 800 * (4 - retries)));
        }
      }
    }
    try {
      updateUser({
        plan: PRO_PLANS.has(plan) ? "pro" : "free",
        planExpiry: endDate.toISOString(),
      });
    } catch (_) {}
    return endDate;
  }

  async function verifyPayment(reference, plan, userId) {
    rememberPaymentReference(reference, plan);
    const v = await verifyOnServer(reference);

    if (v.ok === false) {
      // Paystack says this reference was never successfully charged.
      toast({ message: `Payment not confirmed (${v.error}). Do NOT pay again — contact support on WhatsApp +234 812 763 6057.`, type: "error", duration: 10000 });
      throw new Error("Payment not verified by Paystack");
    }

    const effPlan = v.plan || plan || "pro_monthly";
    const activatedByServer = v.ok && v.activated;
    if (!activatedByServer) {
      try {
        await persistSubscription({ reference, plan: effPlan, userId, verified: !!v.ok });
      } catch (e) {
        toast({ message: "Payment received but activation failed. Press Verify again — do NOT pay again.", type: "error", duration: 10000 });
        throw e;
      }
    } else {
      try {
        updateUser({ plan: PRO_PLANS.has(effPlan) ? "pro" : "free" });
      } catch (_) {}
    }

    if (v.unreachable) {
      toast({ message: "Payment received. Verifying with Paystack…", type: "info" });
    } else if (activatedByServer || v.ok) {
      toast({ message: successToast(effPlan), type: "success" });
    }
    return effPlan;
  }

  async function initializePayment({ plan, userEmail, userId, userName, customAmount, extraMetadata, onPaid, currency = "NGN" }) {
    const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    if (!paystackKey) {
      toast({ message: "Paystack key missing. Add VITE_PAYSTACK_PUBLIC_KEY to .env.", type: "error" });
      return null;
    }

    const planData = PLANS[plan];
    if (!planData && !customAmount) {
      toast({ message: "Invalid plan selected.", type: "error" });
      return null;
    }

    // Custom amounts must meet or beat the plan price — everything lands in Paystack.
    const amountNaira = customAmount && customAmount > 0 ? customAmount : planData.price;
    if (planData && amountNaira < planData.price) {
      toast({ message: `Minimum for this plan is ₦${planData.price.toLocaleString()}.`, type: "error" });
      return null;
    }

    setLoading(true);
    setError(null);

    const reference = `EP-${userId}-${Date.now()}`;
    // Amounts are computed in NGN, then converted — any country can pay.
    const amountMinor = Math.round(convertFromNGN(amountNaira, currency) * 100);

    try {
      let paidRef = null;
      // Partner Plan: attach the payer's school referral code so commissions
      // are computed server-side from tx.metadata.
      let partnerCode = extraMetadata?.partnerCode || null;
      if (!partnerCode && userId) {
        try {
          const { getPartnerCodeForPayment } = await import("../lib/partner");
          partnerCode = await getPartnerCodeForPayment(userId);
        } catch { /* attribution is best-effort */ }
      }
      await openPaystack({
        key: paystackKey,
        email: userEmail,
        amount: amountMinor,
        ref: reference,
        currency,
        metadata: { userId, plan, userName, amountNaira, currency, ...(partnerCode ? { partnerCode } : {}), ...(extraMetadata || {}) },
        onSuccess: async function(response) {
          paidRef = response.reference;
          rememberPaymentReference(response.reference, plan);
          try {
            const v = await verifyOnServer(response.reference);

            if (v.ok === false) {
              toast({ message: `Payment not confirmed (${v.error}). Do NOT pay again — contact support.`, type: "error", duration: 10000 });
              throw new Error("PAYMENT_NOT_VERIFIED");
            }

            if (onPaid) {
              await onPaid(response, v);
            } else {
              if (v.activated) {
                try { updateUser({ plan: PRO_PLANS.has(plan) ? "pro" : "free" }); } catch (_) {}
                toast({ message: successToast(plan), type: "success" });
              } else {
                await persistSubscription({ reference: response.reference, plan, userId, verified: !!v.ok });
                toast({ message: successToast(plan), type: "success" });
              }
            }
          } catch (e) {
            console.error("Verify error:", e);
            const marker = String(e?.message || "");
            if (marker !== "SKIP_GENERIC_TOAST" && marker !== "PAYMENT_NOT_VERIFIED") {
              toast({ message: "Payment received but activation failed. Press Verify on the next page — do NOT pay again.", type: "error", duration: 10000 });
            }
            throw new Error("SKIP_GENERIC_TOAST", { cause: e });
          } finally {
            setLoading(false);
          }
        },
        onClose: function() {
          setLoading(false);
        },
      });
      return paidRef;
    } catch (err) {
      setLoading(false);
      const msg = err.message || "Payment failed. Try again.";
      if (msg !== "Payment cancelled" && msg !== "SKIP_GENERIC_TOAST") {
        setError(msg);
        if (!String(msg).includes("do NOT pay again") && !String(msg).includes("not verified")) {
          toast({ message: msg, type: "error" });
        }
      }
      return null;
    }
  }

  return { initializePayment, verifyPayment, verifyOnServer, loading, error };
}
