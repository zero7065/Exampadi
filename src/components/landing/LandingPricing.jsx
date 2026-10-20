// Pricing (single source of truth: src/config/plans.js) + Schools strip.
import { Link } from "react-router-dom";
import { Check, MessageSquare, Users, GraduationCap } from "lucide-react";
import { PLANS } from "../../config/plans";

export default function LandingPricing() {
  const cards = [
    {
      name: "Free",
      price: "₦0",
      period: "forever",
      popular: false,
      cta: "Start Free",
      href: "/auth",
      features: [
        "15 practice questions daily",
        "3 AI tutor messages daily",
        "2 subjects only",
        "Basic progress tracking",
      ],
    },
    {
      name: "Pro Monthly",
      price: `₦${PLANS.pro_monthly.price.toLocaleString()}`,
      period: "/month",
      popular: true,
      cta: "Go Pro",
      href: "/payment",
      features: [
        "Unlimited practice questions",
        "All 16 subjects unlocked",
        "150 AI messages/month",
        "Full Mock Exams",
        "Detailed analytics",
        "Offline mode",
        "Priority support",
      ],
    },
    {
      name: "Pro Yearly",
      price: `₦${PLANS.pro_yearly.price.toLocaleString()}`,
      period: "/year",
      strike: `₦${PLANS.pro_yearly.originalPrice.toLocaleString()}`,
      badge: "RECOMMENDED — Save ₦14,000",
      popular: false,
      cta: "Best Value",
      href: "/payment",
      features: [
        "Everything in Pro Monthly",
        "250 AI messages/month",
        "Early access to new features",
        "Exclusive leaderboard badge",
        "14-day money-back guarantee",
      ],
    },
  ];

  const extraPlans = [
    {
      name: "IELTS Preparation",
      price: `₦${PLANS.ielts.price.toLocaleString()}`,
      period: "/year",
      badge: "Study Abroad Ready",
      icon: GraduationCap,
      cta: "Start IELTS Prep",
      href: "/payment",
      features: [
        "Everything in Pro Yearly",
        "Full IELTS question bank (100+ questions)",
        "IELTS band score calculator",
        "Writing & Speaking practice with AI feedback",
        "Visa requirement guide",
        "Priority IELTS support",
      ],
    },
    {
      name: "For Schools",
      price: "From ₦2,800",
      period: "/student/month",
      badge: "Classroom Plans",
      icon: Users,
      cta: "Talk to Us",
      href: "https://wa.me/2348127636057?text=Hi!%20I%27m%20interested%20in%20ExamPadi%20for%20my%20school.",
      external: true,
      features: [
        "Teacher dashboard & assignments",
        "Class performance heatmaps",
        "Bulk student onboarding (CSV)",
        "Printable mock exams",
        "Parent progress reports",
        "Custom AI limits per class",
      ],
    },
  ];

  return (
    <section id="pricing" className="lp-section" style={{ background: "linear-gradient(180deg, var(--bg), rgb(var(--primary-rgb) / 0.06))" }}>
      <div className="lp-container">
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 className="lp-h2">Simple, Fair Pricing Built for <span className="lp-gradient-text">Nigerian Students & Schools</span></h2>
          <p className="lp-sub">Start free. Upgrade when you need more power. No hidden fees.</p>
        </div>
        <div className="lp-price-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, maxWidth: 980, margin: "0 auto 48px", alignItems: "stretch" }}>
          {cards.map((plan, i) => (
            <div key={plan.name} className={`lp-animate-in lp-delay-${i + 1}`} style={{
              background: plan.popular ? "var(--landing-gradient)" : "rgb(var(--bg-2-rgb) / 0.72)",
              backdropFilter: plan.popular ? "none" : "blur(20px) saturate(1.4)",
              WebkitBackdropFilter: plan.popular ? "none" : "blur(20px) saturate(1.4)",
              borderRadius: 20, padding: 32,
              border: plan.popular ? "none" : "1px solid var(--border)",
              position: "relative", overflow: "hidden",
              transform: plan.popular ? "scale(1.05)" : "none",
              color: plan.popular ? "#fff" : "var(--text)",
              display: "flex", flexDirection: "column",
            }}>
              {plan.popular && (
                <div style={{
                  position: "absolute", top: 16, right: -32,
                  background: "rgba(255,255,255,0.2)", color: "#fff",
                  padding: "4px 40px", fontSize: 11, fontWeight: 700,
                  transform: "rotate(45deg)", backdropFilter: "blur(8px)",
                }}>POPULAR</div>
              )}
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>{plan.name}</h3>
              {plan.badge && (
                <div style={{ fontSize: 11, fontWeight: 800, color: plan.popular ? "#fff" : "var(--accent)", letterSpacing: "0.04em", marginTop: 4 }}>{plan.badge}</div>
              )}
              <div style={{ margin: "16px 0" }}>
                {plan.strike && (
                  <span style={{ fontSize: 15, opacity: 0.6, textDecoration: "line-through", marginRight: 8 }}>{plan.strike}</span>
                )}
                <span style={{ fontSize: 36, fontWeight: 900 }}>{plan.price}</span>
                <span style={{ fontSize: 14, opacity: 0.7 }}>{plan.period}</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, lineHeight: 1.4 }}>
                    <Check size={16} style={{ flexShrink: 0, color: plan.popular ? "rgba(255,255,255,0.85)" : "var(--primary)" }} />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href={plan.href}
                target={plan.external ? "_blank" : undefined}
                rel={plan.external ? "noopener noreferrer" : undefined}
                style={{
                  display: "block", textAlign: "center", padding: "14px", borderRadius: 12,
                  fontWeight: 700, fontSize: 14, textDecoration: "none",
                  background: plan.popular ? "rgba(255,255,255,0.2)" : "var(--landing-gradient)",
                  color: "#fff",
                  border: plan.popular ? "1px solid rgba(255,255,255,0.2)" : "none",
                }}
              >{plan.cta}</a>
            </div>
          ))}
        </div>

        {/* Extra Plans: IELTS & Schools */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24, maxWidth: 980, margin: "0 auto" }}>
          {extraPlans.map((plan, i) => (
            <div key={plan.name} className={`lp-animate-in lp-delay-${i + 1}`} style={{
              background: "rgb(var(--bg-2-rgb) / 0.72)",
              backdropFilter: "blur(20px) saturate(1.4)",
              WebkitBackdropFilter: "blur(20px) saturate(1.4)",
              borderRadius: 20, padding: 32,
              border: "1px solid var(--border)",
              color: "var(--text)",
              display: "flex", flexDirection: "column",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <plan.icon size={20} color="var(--primary)" />
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{plan.name}</h3>
              </div>
              {plan.badge && (
                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--accent)", letterSpacing: "0.04em", marginBottom: 12 }}>{plan.badge}</div>
              )}
              <div style={{ margin: "8px 0 20px" }}>
                <span style={{ fontSize: 36, fontWeight: 900 }}>{plan.price}</span>
                <span style={{ fontSize: 14, color: "var(--text-muted)" }}>{plan.period}</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, lineHeight: 1.4 }}>
                    <Check size={16} style={{ flexShrink: 0, color: "var(--primary)" }} />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href={plan.href}
                target={plan.external ? "_blank" : undefined}
                rel={plan.external ? "noopener noreferrer" : undefined}
                style={{
                  display: "block", textAlign: "center", padding: "14px", borderRadius: 12,
                  fontWeight: 700, fontSize: 14, textDecoration: "none",
                  background: plan.external ? "var(--accent)" : "var(--landing-gradient)",
                  color: "#fff",
                  border: "none",
                }}
              >{plan.cta}</a>
            </div>
          ))}
        </div>
      </div>
      <style>{`@media (max-width: 900px) { .lp-price-grid { grid-template-columns: 1fr !important; max-width: 420px; } }`}</style>
    </section>
  );
}
