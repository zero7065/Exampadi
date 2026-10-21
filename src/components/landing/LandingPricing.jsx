// Pricing (single source of truth: src/config/plans.js) + Schools strip.
import { Link } from "react-router-dom";
import { Check, Users, GraduationCap } from "lucide-react";
import { PLANS } from "../../config/plans";

function PlanCta({ plan, className }) {
  const style = {
    display: "block",
    textAlign: "center",
    padding: "13px 16px",
    borderRadius: 12,
    fontWeight: 800,
    fontSize: 14,
    textDecoration: "none",
    lineHeight: 1.3,
  };

  if (plan.external) {
    return (
      <a
        href={plan.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        style={{ ...style, background: "var(--accent)", color: "#04120D" }}
      >
        {plan.cta}
      </a>
    );
  }

  return (
    <Link
      to={plan.href}
      className={className}
      style={{
        ...style,
        background: plan.popular ? "rgba(4,18,13,0.88)" : "var(--landing-gradient)",
        color: plan.popular ? "#F2F7F5" : "#04120D",
      }}
    >
      {plan.cta}
    </Link>
  );
}

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
    <section
      id="pricing"
      className="lp-section"
      style={{ background: "linear-gradient(180deg, var(--bg), rgb(var(--primary-rgb) / 0.06))" }}
    >
      <div className="lp-container">
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 className="lp-h2">
            Simple, Fair Pricing Built for{" "}
            <span className="lp-gradient-text">Nigerian Students & Schools</span>
          </h2>
          <p className="lp-sub">Start free. Upgrade when you need more power. No hidden fees.</p>
        </div>

        <div className="lp-price-grid">
          {cards.map((plan, i) => (
            <article
              key={plan.name}
              className={`lp-price-card lp-animate-in lp-delay-${i + 1}${plan.popular ? " is-popular" : ""}`}
            >
              {plan.popular && <div className="lp-price-ribbon">POPULAR</div>}
              <header className="lp-price-head">
                <h3>{plan.name}</h3>
                {plan.badge && <div className="lp-price-badge">{plan.badge}</div>}
              </header>
              <div className="lp-price-amount">
                {plan.strike && <span className="lp-price-strike">{plan.strike}</span>}
                <span className="lp-price-value">{plan.price}</span>
                <span className="lp-price-period">{plan.period}</span>
              </div>
              <ul className="lp-price-features">
                {plan.features.map((f) => (
                  <li key={f}>
                    <Check size={16} aria-hidden="true" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <PlanCta plan={plan} className="lp-price-cta" />
            </article>
          ))}
        </div>

        <div className="lp-extra-grid">
          {extraPlans.map((plan, i) => (
            <article key={plan.name} className={`lp-price-card lp-extra-card lp-animate-in lp-delay-${i + 1}`}>
              <header className="lp-extra-head">
                <plan.icon size={20} color="var(--primary)" aria-hidden="true" />
                <h3>{plan.name}</h3>
              </header>
              {plan.badge && <div className="lp-price-badge">{plan.badge}</div>}
              <div className="lp-price-amount">
                <span className="lp-price-value">{plan.price}</span>
                <span className="lp-price-period">{plan.period}</span>
              </div>
              <ul className="lp-price-features">
                {plan.features.map((f) => (
                  <li key={f}>
                    <Check size={16} aria-hidden="true" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <PlanCta plan={plan} className="lp-price-cta" />
            </article>
          ))}
        </div>
      </div>

      <style>{`
        .lp-price-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 20px;
          max-width: 1040px;
          margin: 0 auto 24px;
          align-items: stretch;
        }
        .lp-extra-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
          max-width: 1040px;
          margin: 0 auto;
          align-items: stretch;
        }
        .lp-price-card {
          min-width: 0;
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 26px 22px;
          border-radius: 18px;
          border: 1px solid var(--border);
          background: rgb(var(--bg-2-rgb) / 0.78);
          color: var(--text);
          overflow: hidden;
          position: relative;
        }
        .lp-price-card.is-popular {
          background: var(--landing-gradient);
          border-color: transparent;
          color: #04120D;
          transform: translateY(-6px);
          box-shadow: 0 18px 44px rgb(var(--primary-rgb) / 0.18);
        }
        .lp-price-head h3,
        .lp-extra-head h3 {
          font-size: 17px;
          font-weight: 800;
          margin: 0;
          line-height: 1.3;
          overflow-wrap: anywhere;
        }
        .lp-price-head {
          padding-right: 44px;
        }
        .lp-price-badge {
          margin-top: 6px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.03em;
          line-height: 1.4;
          color: var(--accent);
          overflow-wrap: anywhere;
        }
        .lp-price-card.is-popular .lp-price-badge {
          color: rgba(4, 18, 13, 0.78);
        }
        .lp-price-amount {
          display: flex;
          align-items: baseline;
          flex-wrap: wrap;
          gap: 6px;
          margin: 16px 0 18px;
          min-width: 0;
        }
        .lp-price-value {
          font-size: clamp(28px, 3vw, 36px);
          font-weight: 900;
          line-height: 1.05;
          letter-spacing: -0.03em;
          overflow-wrap: anywhere;
        }
        .lp-price-period {
          font-size: 13px;
          opacity: 0.72;
          font-weight: 600;
        }
        .lp-price-strike {
          width: 100%;
          font-size: 13px;
          opacity: 0.62;
          text-decoration: line-through;
        }
        .lp-price-features {
          list-style: none;
          padding: 0;
          margin: 0 0 22px;
          display: flex;
          flex-direction: column;
          gap: 9px;
          flex: 1;
        }
        .lp-price-features li {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 13px;
          line-height: 1.45;
          min-width: 0;
        }
        .lp-price-features li svg {
          flex-shrink: 0;
          margin-top: 1px;
          color: var(--primary);
        }
        .lp-price-card.is-popular .lp-price-features li svg {
          color: rgba(4, 18, 13, 0.82);
        }
        .lp-price-features li span {
          min-width: 0;
          overflow-wrap: anywhere;
        }
        .lp-price-cta {
          margin-top: auto;
        }
        .lp-price-ribbon {
          position: absolute;
          top: 14px;
          right: -34px;
          width: 130px;
          text-align: center;
          padding: 4px 0;
          background: rgba(4, 18, 13, 0.16);
          color: #04120D;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.06em;
          transform: rotate(45deg);
        }
        .lp-extra-head {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        @media (max-width: 980px) {
          .lp-price-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            max-width: 700px;
          }
          .lp-price-card.is-popular {
            transform: none;
          }
          .lp-price-grid .lp-price-card:last-child {
            grid-column: 1 / -1;
            max-width: 420px;
            width: 100%;
            justify-self: center;
          }
          .lp-extra-grid {
            grid-template-columns: 1fr;
            max-width: 700px;
          }
        }
        @media (max-width: 620px) {
          .lp-price-grid {
            grid-template-columns: 1fr;
            max-width: 440px;
            gap: 14px;
          }
          .lp-price-grid .lp-price-card:last-child {
            grid-column: auto;
            max-width: none;
          }
          .lp-price-card {
            padding: 22px 18px;
          }
          .lp-price-head {
            padding-right: 48px;
          }
        }
      `}</style>
    </section>
  );
}
