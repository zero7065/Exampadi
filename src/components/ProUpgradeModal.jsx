import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { usePaystack } from "../hooks/usePaystack";
import { useToast } from "./Toast";
import { PLANS } from "../config/plans";
import { X, Check, Crown, ChevronRight, Loader2, Zap, ShieldCheck, ArrowLeft } from "lucide-react";

export default function ProUpgradeModal({ open, onClose, reason, dismissible }) {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [billing, setBilling] = useState("yearly");
  const { initializePayment, loading, error: payError } = usePaystack();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640);

  useEffect(() => {
    if (!open) return;
    const handler = () => setIsMobile(window.innerWidth <= 640);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [open]);

  if (!open) return null;

  const plan = billing === "yearly" ? "pro_yearly" : "pro_monthly";
  const planData = PLANS[plan];
  const freePlan = PLANS.free;

  function getReasonPill() {
    switch (reason) {
      case "questions": return { text: `⚡ Daily limit reached — ${PLANS.free.limits.questionsPerDay}/${PLANS.free.limits.questionsPerDay} questions used`, color: "#FF4D6A" };
      case "ai": return { text: `🤖 AI limit reached — Pro gets 60–80 AI messages/month`, color: "var(--primary)" };
      case "mock": return { text: "📝 Mock exams require Pro", color: "#4D9EFF" };
      case "subjects": return { text: "📚 Unlock all subjects with Pro", color: "#FF9F43" };
      default: return null;
    }
  }

  const reasonPill = getReasonPill();

  async function handleUpgrade() {
    if (!user) {
      onClose && onClose();
      navigate("/auth");
      return;
    }
    const result = await initializePayment({
      plan,
      userEmail: user.email,
      userId: user.uid,
      userName: user.displayName || "Student",
      onPaid: async (response) => {
        try {
          await refreshProfile();
        } catch (_) { /* profile refresh is best-effort */ }
        toast({ message: "Pro activated! Welcome to ExamPadi Pro", type: "success" });
        onClose && onClose();
        navigate("/payment/success", { state: { reference: response.reference, plan } });
      },
    });
    if (!result) return;
  }

  const monthlyEquiv = billing === "yearly"
    ? `₦${Math.round(PLANS.pro_yearly.price / 12).toLocaleString()}/month`
    : null;

  async function handlePackBuy() {
    if (!user) {
      onClose && onClose();
      navigate("/auth");
      return;
    }
    const result = await initializePayment({
      plan: "ai_pack_50",
      userEmail: user.email,
      userId: user.uid,
      userName: user.displayName || "Student",
      onPaid: async () => {
        try {
          await refreshProfile();
        } catch { /* profile refresh is best-effort */ }
        toast({ message: "50 AI messages added to your balance.", type: "success" });
        onClose && onClose();
      },
    });
    if (!result) return;
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center",
      padding: isMobile ? "0" : "16px",
      fontFamily: "'Inter', system-ui, sans-serif",
      animation: "modalFade 0.2s ease-out",
    }}>
      <style>{`
        @keyframes modalFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
      {/* Gradient border wrapper */}
      <div style={{
        background: "linear-gradient(135deg, var(--primary), var(--accent))",
        padding: 1,
        borderRadius: isMobile ? "24px 24px 0 0" : 28,
        maxWidth: isMobile ? "100%" : 560,
        width: "100%",
        boxShadow: "0 24px 80px rgb(var(--primary-rgb) / 0.3), 0 0 60px rgb(var(--accent-rgb) / 0.1)",
        animation: "modalSlideUp 0.3s ease-out",
      }}>
        <div style={{
          background: "var(--bg)",
          borderRadius: isMobile ? "23px 23px 0 0" : 27,
          padding: isMobile ? "24px 20px" : "32px 28px",
          position: "relative", maxHeight: isMobile ? "80vh" : "90vh", overflowY: "auto",
        }}>
          {/* Close button */}
          {dismissible && (
            <button onClick={onClose} style={{
              position: "absolute", top: 16, right: 16, width: 32, height: 32,
              borderRadius: "50%", background: "var(--bg-3)", border: "1px solid #333",
              color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", transition: "all 0.2s",
            }}>
              <X size={16} />
            </button>
          )}

          {/* Animated Crown */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{
              display: "inline-flex", width: 64, height: 64, borderRadius: "50%",
              background: "linear-gradient(135deg, rgb(var(--accent-rgb) / 0.2), rgb(var(--accent-rgb) / 0.05))",
              border: "1px solid rgb(var(--accent-rgb) / 0.3)",
              alignItems: "center", justifyContent: "center",
              animation: "crownGlow 2s ease-in-out infinite",
            }}>
              <Crown size={32} color="var(--accent)" />
            </div>
            <style>{`
              @keyframes crownGlow {
                0%, 100% { box-shadow: 0 0 20px rgb(var(--accent-rgb) / 0.2); }
                50% { box-shadow: 0 0 40px rgb(var(--accent-rgb) / 0.4); }
              }
            `}</style>
          </div>

          {/* Headline */}
          <h2 style={{ color: "var(--text)", fontSize: 28, fontWeight: 800, textAlign: "center", margin: "0 0 8px", letterSpacing: "-0.5px" }}>
            Unlock Your Full Potential
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: 15, textAlign: "center", margin: "0 0 24px" }}>
            Top JAMB scorers study smarter, not harder. Go Pro.
          </p>

          {/* Reason pill */}
          {reasonPill && (
            <div style={{
              display: "flex", justifyContent: "center", marginBottom: 24,
            }}>
              <span style={{
                padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600,
                background: `${reasonPill.color}15`, color: reasonPill.color,
                border: `1px solid ${reasonPill.color}30`,
              }}>
                {reasonPill.text}
              </span>
            </div>
          )}

          {/* Plan toggle */}
          <div style={{
            display: "flex", background: "var(--bg-3)", borderRadius: 14,
            padding: 4, marginBottom: 24, border: "1px solid #222",
          }}>
            {[
              { id: "monthly", label: "Monthly" },
              { id: "yearly", label: "Yearly", badge: `SAVE ₦${(PLANS.pro_monthly.price * 12 - PLANS.pro_yearly.price).toLocaleString()}` },
            ].map((tab) => {
              const isActive = billing === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setBilling(tab.id)}
                  style={{
                    flex: 1, padding: "12px 16px", borderRadius: 11,
                    background: isActive ? "var(--primary)" : "transparent",
                    border: "none", cursor: "pointer", textAlign: "center",
                    position: "relative", transition: "all 0.2s",
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 14, color: isActive ? "#fff" : "var(--text-muted)" }}>
                    {tab.label}
                  </span>
                  {tab.badge && (
                    <span style={{
                      display: "block", fontSize: 10, fontWeight: 700,
                      color: isActive ? "var(--accent)" : "var(--accent)", marginTop: 2,
                      opacity: isActive ? 1 : 0.6,
                    }}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Price */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4 }}>
              {billing === "yearly" && (
                <span style={{ fontSize: 16, color: "#FF6B6B", textDecoration: "line-through", fontWeight: 500 }}>
                  ₦{(PLANS.pro_yearly.originalPrice || 42000).toLocaleString()}
                </span>
              )}
              <span style={{ fontSize: 48, fontWeight: 800, color: "var(--text)", letterSpacing: "-1px" }}>
                ₦{planData.price.toLocaleString()}
              </span>
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
              {billing === "yearly" ? `/year · that's just ${monthlyEquiv}` : "/month"}
            </div>
          </div>

          {/* Features columns */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", marginBottom: 20 }}>
            {planData.features.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%",
                  background: "rgba(74,222,128,0.15)", display: "flex",
                  alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <Check size={12} color="#4ADE80" />
                </div>
                <span style={{ color: "var(--text)", fontSize: 13, lineHeight: 1.3 }}>{f}</span>
              </div>
            ))}
          </div>

          {/* Locked free features */}
          <div style={{
            background: "rgba(255,77,106,0.05)", borderRadius: 12, padding: "12px 16px",
            marginBottom: 24, border: "1px solid rgba(255,77,106,0.1)",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#FF6B6B", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
              What you're missing on Free
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {freePlan.locked.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <X size={12} color="#FF6B6B" style={{ opacity: 0.6, flexShrink: 0 }} />
                  <span style={{ color: "#999", fontSize: 12 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleUpgrade}
            disabled={loading}
            style={{
              width: "100%", height: 56, borderRadius: 16, border: "none",
              background: "linear-gradient(135deg, var(--primary) 0%, var(--accent) 50%, var(--accent) 100%)",
              color: "#fff", fontWeight: 700, fontSize: 17, cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all 0.2s", opacity: loading ? 0.7 : 1,
              boxShadow: "0 8px 32px rgb(var(--primary-rgb) / 0.3)",
            }}
            onMouseOver={(e) => {
              if (!loading) { e.currentTarget.style.filter = "brightness(1.1)"; e.currentTarget.style.transform = "scale(1.02)"; }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.filter = "brightness(1)"; e.currentTarget.style.transform = "scale(1)";
            }}
          >
            {loading ? (
              <Loader2 size={22} style={{ animation: "spin 0.8s linear infinite" }} />
            ) : (
              <>
                Activate Pro {billing === "yearly" ? "Yearly" : "Monthly"}
                <ChevronRight size={20} />
              </>
            )}
          </button>

          {/* Just need a top-up? One-off AI credit pack */}
          {reason === "ai" && (
            <button
              onClick={handlePackBuy}
              disabled={loading}
              style={{
                width: "100%", height: 48, borderRadius: 14, marginTop: 12,
                background: "var(--bg-3)", border: "1px solid var(--border)",
                color: "var(--text)", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                fontFamily: "inherit", opacity: loading ? 0.7 : 1,
              }}
            >
              <Zap size={16} color="var(--accent)" />
              Just a top-up? Get 50 AI messages — ₦1,500 one-time
            </button>
          )}

          {/* Trust signals */}
          <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 20, marginBottom: 16 }}>
            {[
              { icon: <ShieldCheck size={14} />, label: "Secured by Paystack" },
              { icon: <ArrowLeft size={14} style={{ transform: "rotate(180deg)" }} />, label: "Cancel anytime" },
              { icon: <Zap size={14} />, label: "Naira payments" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-muted)", fontSize: 11, fontWeight: 500 }}>
                {item.icon} {item.label}
              </div>
            ))}
          </div>
          {payError && (
            <p style={{ color: "#FF6B6B", fontSize: 13, textAlign: "center", margin: "0 0 12px", fontWeight: 600 }}>
              {payError}
            </p>
          )}

          {/* Dismiss */}
          <div style={{ textAlign: "center" }}>
            <button
              onClick={onClose}
              style={{
                background: "none", border: "none", color: "var(--text-muted)", fontSize: 13,
                cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2,
                fontFamily: "inherit",
              }}
            >
              Continue with Free plan
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}