// src/pages/PaymentPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { usePaystack } from "../hooks/usePaystack";
import { PLANS as CONFIG_PLANS, TEAM_PLANS, CURRENCIES, formatMoney, teamPrice } from "../config/plans";
import { Check, Crown, Zap, ShieldCheck, Sparkles, ChevronRight, Loader2, Award, Users, Ticket } from "lucide-react";
import { logActivity } from "../lib/activityLog";
import { ACTIONS } from "../lib/actions";
import { createTeamDraft, activateTeam, joinTeamByCode } from "../lib/teams";

const PaymentPage = () => {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState(null);
  // Teams state
  const [teamPlan, setTeamPlan] = useState("team_monthly");
  const [teamSeats, setTeamSeats] = useState(5);
  const [teamName, setTeamName] = useState("");
  const [teamPaying, setTeamPaying] = useState(false);
  const [teamCode, setTeamCode] = useState("");
  const [redeemCode, setRedeemCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [customPaying, setCustomPaying] = useState(false);
  const [currency, setCurrency] = useState("NGN");
  const { initializePayment } = usePaystack();

  const YEARLY = new Set(["pro_yearly", "ielts"]);
  const PRO_SET = new Set(["pro_monthly", "pro_yearly", "ielts"]);

  const activatePro = async (planId, duration, reference) => {
    const expiryDate = new Date();
    expiryDate.setHours(23, 59, 59, 999);
    expiryDate.setDate(expiryDate.getDate() + duration);

    let persisted = true;
    if (db && user) {
      let retries = 3;
      let activated = false;
      while (retries > 0 && !activated) {
        try {
          await updateDoc(doc(db, "users", user.uid), {
            subscription: {
              plan: planId,
              status: "active",
              reference,
              startDate: serverTimestamp(),
              endDate: expiryDate.toISOString(),
              autoRenew: true,
              verified: true,
            },
          });
          activated = true;
        } catch (e) {
          retries--;
          console.warn(`Subscription write failed (${retries} retries left):`, e?.message);
          if (retries === 0) {
            persisted = false;
            toast({ message: "Payment received but activation failed. Press Verify on the next page — do NOT pay again.", type: "error", duration: 10000 });
          } else {
            await new Promise((r) => setTimeout(r, 1000 * (4 - retries)));
          }
        }
      }
    }

    try {
      updateUser({
        plan: PRO_SET.has(planId) ? "pro" : "free",
        planExpiry: expiryDate.toISOString(),
      });
    } catch (e) {
      console.warn("Failed to update AuthContext:", e);
    }
    return persisted;
  };

  const handlePayment = async (planKey) => {
    if (!user) return navigate("/auth");

    const planConfig = CONFIG_PLANS[planKey];
    if (!planConfig || planConfig.price <= 0) {
      toast({ message: "Invalid plan selected.", type: "error" });
      return;
    }

    setPayLoading(true);
    setPayError(null);
    try {
      const paidRef = await initializePayment({
        plan: planKey,
        userEmail: user.email,
        userId: user.uid,
        userName: user.displayName || "Student",
        currency,
        onPaid: async (response) => {
          const duration = YEARLY.has(planKey) ? 365 : 30;
          const persisted = await activatePro(planKey, duration, response.reference);
          logActivity({ action: ACTIONS.PAYMENT_SUCCESS, userId: user.uid, email: user.email, details: { plan: planKey, reference: response.reference, amount: planConfig.price, currency, persisted } });
          if (persisted) toast({ message: "Payment successful! You're now Pro", type: "success" });
          navigate("/payment/success", { state: { reference: response.reference, plan: planKey, activated: persisted } });
        },
      });
      if (!paidRef) {
        // closed before completion — nothing charged
      }
    } catch (err) {
      const msg = err.message || "Payment failed. Try again.";
      if (msg !== "Payment cancelled" && msg !== "SKIP_GENERIC_TOAST") {
        setPayError(msg);
        logActivity({ action: ACTIONS.PAYMENT_FAILED, userId: user.uid, email: user.email, details: { plan: planKey, error: msg } });
      }
    } finally {
      setPayLoading(false);
    }
  };

  async function handleTeamPay() {
    if (!user) return navigate("/auth");
    const seats = Math.min(100, Math.max(2, Math.floor(Number(teamSeats) || 2)));
    const total = teamPrice(teamPlan, seats);
    setTeamPaying(true);
    try {
      const { teamId, code } = await createTeamDraft({
        name: teamName.trim() || `${user.displayName || "Student"}'s Team`,
        plan: teamPlan,
        seats,
        payerUid: user.uid,
        payerEmail: user.email,
      });
      const paidRef = await initializePayment({
        plan: teamPlan,
        userEmail: user.email,
        userId: user.uid,
        userName: user.displayName || "Student",
        customAmount: total,
        currency,
        extraMetadata: { teamId, teamPurchase: true, seats },
        onPaid: async (response) => {
          try {
            await activateTeam({
              teamId,
              payerUid: user.uid,
              payerEmail: user.email,
              reference: response.reference,
              amountNaira: total,
            });
          } catch (e) {
            toast({ message: e?.message || "Team activation failed. Contact support on WhatsApp +234 812 763 6057 — do NOT pay again.", type: "error", duration: 10000 });
            throw new Error("SKIP_GENERIC_TOAST", { cause: e });
          }
          setTeamCode(code);
          toast({ message: `Team activated! Share code ${code} with your group.`, type: "success" });
          logActivity({ action: ACTIONS.PAYMENT_SUCCESS, userId: user.uid, email: user.email, details: { plan: teamPlan, teamId, seats, reference: response.reference, amount: total } });
          navigate("/team/" + teamId, { state: { reference: response.reference } });
        },
      });
      if (!paidRef) {
        // Payment window closed before completion — draft stays pending.
      }
    } catch (err) {
      toast({ message: err.message || "Team purchase failed.", type: "error" });
    } finally {
      setTeamPaying(false);
    }
  }

  async function handleRedeem() {
    if (!user) return navigate("/auth");
    if (!redeemCode.trim()) {
      toast({ message: "Enter your team code.", type: "error" });
      return;
    }
    setRedeeming(true);
    try {
      const res = await joinTeamByCode(redeemCode, user.uid);
      toast({ message: `Welcome to ${res.teamName}! Pro active until ${new Date(res.expiry).toLocaleDateString()}.`, type: "success" });
      navigate("/team/" + res.teamId);
    } catch (err) {
      toast({ message: err.message || "Could not join team.", type: "error" });
    } finally {
      setRedeeming(false);
    }
  }

  async function handleCustomPay() {
    if (!user) return navigate("/auth");
    const cur = CURRENCIES[currency] || CURRENCIES.NGN;
    const entered = Number(customAmount) || 0;
    if (entered < cur.minCustom) {
      toast({ message: `Minimum is ${cur.symbol}${cur.minCustom.toLocaleString()} (one month of Pro).`, type: "error" });
      return;
    }
    // Convert to NGN for activation thresholds; Paystack charges the entered currency.
    const amountNGN = Math.round(entered / cur.rate);
    setCustomPaying(true);
    try {
      const paidRef = await initializePayment({
        plan: "pro_monthly",
        userEmail: user.email,
        userId: user.uid,
        userName: user.displayName || "Student",
        customAmount: amountNGN,
        currency,
        extraMetadata: { customPayment: true, enteredAmount: entered },
      });
      if (paidRef) navigate("/payment/success", { state: { reference: paidRef, plan: "pro_monthly" } });
    } catch (err) {
      toast({ message: err.message || "Payment failed.", type: "error" });
    } finally {
      setCustomPaying(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-16 animate-fade">
      <header className="text-center space-y-6">
        <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-5 py-2 rounded-full font-black text-[10px] uppercase tracking-widest border border-accent/20">
          <Crown size={14} />
          <span>Go Pro with ExamPadi</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-text tracking-tight">Unlock Your Full Potential</h1>
        <p className="text-text-muted text-xl max-w-2xl mx-auto font-medium">Don't let the daily question limit hold you back. Join the 300+ score squad today.</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="text-sm text-text-muted font-semibold">Pay in:</span>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="input-field" style={{ maxWidth: 200 }}>
            {Object.entries(CURRENCIES).map(([code, c]) => (
              <option key={code} value={code}>{c.symbol} {code} — {c.label}</option>
            ))}
          </select>
        </div>
      </header>

      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {[
          { key: "pro_monthly", ...CONFIG_PLANS.pro_monthly },
          { key: "pro_yearly", ...CONFIG_PLANS.pro_yearly },
          { key: "ielts", ...CONFIG_PLANS.ielts },
        ].map((plan) => (
          <div
            key={plan.key}
            className={`glass-card p-8 md:p-10 relative overflow-hidden flex flex-col group transition-all duration-500 hover:-translate-y-2 ${
              plan.badge ? "border-primary/40 ring-1 ring-primary/20 bg-primary-dim" : "border-border"
            }`}
          >
            {plan.badge && (
              <div className="absolute top-0 right-0 bg-primary text-black font-black text-[10px] px-6 py-2 uppercase tracking-widest rounded-bl-2xl">
                {plan.badge}
              </div>
            )}
            <div className="mb-8">
              <h3 className="text-2xl font-black mb-2 text-text">{plan.name}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black font-mono tracking-tighter">{formatMoney(plan.price, currency)}</span>
                <span className="text-text-muted font-bold text-sm">/ {plan.interval === "yearly" ? "yr" : "mo"}</span>
              </div>
              {plan.key === "pro_yearly" && (
                <div className="text-primary font-black text-xs uppercase mt-2 tracking-widest">
                  Save ₦{(CONFIG_PLANS.pro_monthly.price * 12 - plan.price).toLocaleString()}
                </div>
              )}
              {plan.key === "ielts" && (
                <div className="text-accent font-black text-xs uppercase mt-2 tracking-widest">
                  Full year · Study abroad ready
                </div>
              )}
            </div>
            <div className="space-y-4 flex-1 mb-10">
              {plan.features.map((feature, i) => (
                <div key={i} className="flex items-start gap-3 text-sm font-medium">
                  <div className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center text-primary mt-0.5 shrink-0"><Check size={14} /></div>
                  <span className="text-text-muted">{feature}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2 w-full">
              <button
                onClick={() => handlePayment(plan.key)}
                disabled={payLoading}
                className={`w-full h-14 rounded-2xl font-black text-lg shadow-xl flex items-center justify-center gap-3 transition-all ${
                  plan.badge ? "bg-primary text-black shadow-primary/20 hover:scale-105" : "bg-bg-3 text-text border border-border hover:bg-border"
                }`}
              >
                {payLoading ? <Loader2 className="animate-spin" size={24} /> : <>Pay {formatMoney(plan.price, currency)}<ChevronRight size={20} /></>}
              </button>
              {payError && <p className="text-danger text-[13px] text-center font-bold">{payError}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* ── Teams: one person pays for the whole group ── */}
      <div className="glass-card p-8 md:p-10 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary"><Users size={22} /></div>
          <h2 className="text-2xl font-black text-text">Pay for Your Team</h2>
        </div>
        <p className="text-text-muted mb-6">One payment covers everyone — classmates, tutorial group, family. Classroom Monthly is {formatMoney(TEAM_PLANS.team_monthly.pricePerSeat, currency)}/seat with 10% off at 10+ seats and 20% off at 15+ seats; Classroom Yearly is {formatMoney(TEAM_PLANS.team_yearly.pricePerSeat, currency)}/seat with a locked {formatMoney(22000, currency)}/seat at 15+ seats. Each member redeems your team code and gets Pro until your plan expires. You occupy the first seat.</p>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <label className="text-sm font-bold text-text">Team name
            <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. SS3 Physics Squad" className="input-field mt-2" />
          </label>
          <label className="text-sm font-bold text-text">Plan
            <select value={teamPlan} onChange={(e) => setTeamPlan(e.target.value)} className="input-field mt-2">
              <option value="team_monthly">Classroom Monthly — {formatMoney(TEAM_PLANS.team_monthly.pricePerSeat, currency)}/seat/mo</option>
              <option value="team_yearly">Classroom Yearly — {formatMoney(TEAM_PLANS.team_yearly.pricePerSeat, currency)}/seat/yr</option>
            </select>
          </label>
        </div>

        <label className="text-sm font-bold text-text">Seats (2–100)
          <div className="flex items-center gap-4 mt-2">
            <button onClick={() => setTeamSeats(s => Math.max(2, (Number(s) || 2) - 1))} className="btn-secondary px-5 h-12 text-xl font-black">−</button>
            <span className="text-3xl font-black font-mono text-text w-20 text-center">{teamSeats}</span>
            <button onClick={() => setTeamSeats(s => Math.min(100, (Number(s) || 2) + 1))} className="btn-secondary px-5 h-12 text-xl font-black">+</button>
            <span className="text-text-muted text-sm ml-auto">Total: <strong className="text-text text-xl font-mono">{formatMoney(teamPrice(teamPlan, teamSeats), currency)}</strong></span>
          </div>
        </label>

        <button onClick={handleTeamPay} disabled={teamPaying} className="btn-primary w-full h-14 text-lg mt-6 disabled:opacity-60">
          {teamPaying ? <Loader2 className="animate-spin" size={22} /> : <>Pay {formatMoney(teamPrice(teamPlan, teamSeats), currency)} for {teamSeats} seats <ChevronRight size={20} /></>}
        </button>
        {teamCode && (
          <div className="mt-4 p-4 rounded-2xl bg-primary/10 border border-primary/30 text-center">
            <div className="text-xs font-black uppercase tracking-widest text-text-muted mb-1">Share this code with your team</div>
            <div className="text-3xl font-black font-mono tracking-widest text-primary">{teamCode}</div>
          </div>
        )}

        {/* Redeem */}
        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex items-center gap-2 mb-2">
            <Ticket size={18} className="text-accent" />
            <h3 className="font-black text-text">Have a team code?</h3>
          </div>
          <div className="flex gap-2">
            <input value={redeemCode} onChange={(e) => setRedeemCode(e.target.value.toUpperCase())} placeholder="TEAM-XXXXXX" className="input-field font-mono tracking-widest" />
            <button onClick={handleRedeem} disabled={redeeming} className="btn-secondary px-6 whitespace-nowrap disabled:opacity-60">
              {redeeming ? <Loader2 className="animate-spin" size={18} /> : "Join team"}
            </button>
          </div>
        </div>

        {/* Custom amount */}
        <div className="mt-6 pt-6 border-t border-border">
          <h3 className="font-black text-text mb-1">Pay a custom amount</h3>
          <p className="text-text-muted text-sm mb-3">Any amount from <strong className="text-text">{CURRENCIES[currency].symbol}{CURRENCIES[currency].minCustom.toLocaleString()}</strong> upward goes straight to our Paystack and activates Pro Monthly on your account.</p>
          <div className="flex gap-2">
            <input type="number" min={CURRENCIES[currency].minCustom} value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} placeholder={`e.g. ${CURRENCIES[currency].minCustom * 2}`} className="input-field font-mono" />
            <button onClick={handleCustomPay} disabled={customPaying} className="btn-secondary px-6 whitespace-nowrap disabled:opacity-60">
              {customPaying ? <Loader2 className="animate-spin" size={18} /> : <>Pay custom</>}
            </button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-16 border-t border-border">
        <TrustItem icon={<ShieldCheck size={24} />} title="Secure Checkout" label="Paystack Encrypted" />
        <TrustItem icon={<Zap size={24} />} title="Instant Access" label="Automated Activation" />
        <TrustItem icon={<Sparkles size={24} />} title="Premium Support" label="Priority AI Analysis" />
        <TrustItem icon={<Award size={24} />} title="Score Guarantee" label="Proven Study Method" />
      </div>

      <p className="text-center text-text-muted text-sm max-w-2xl mx-auto">
        All payments go securely to our Paystack account. <strong className="text-text">No refunds</strong> — if anything goes wrong with payment or activation, contact the team on WhatsApp <strong className="text-text">+234 812 763 6057</strong> and we'll resolve it.
      </p>
    </div>
  );
};

const TrustItem = ({ icon, title, label }) => (
  <div className="flex flex-col items-center text-center space-y-2">
    <div className="text-primary mb-2 opacity-60">{icon}</div>
    <div className="font-bold text-sm text-text">{title}</div>
    <div className="text-[10px] font-black uppercase tracking-widest text-text-muted">{label}</div>
  </div>
);

export default PaymentPage;
