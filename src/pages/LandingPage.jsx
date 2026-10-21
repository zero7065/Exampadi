// src/pages/LandingPage.jsx — composes theme-aware landing sections.
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ImageCarousel from "../components/ImageCarousel";
import LandingStyles from "../components/landing/LandingStyles";
import LandingNav from "../components/landing/LandingNav";
import LandingHero from "../components/landing/LandingHero";
import LandingBento, { LandingStats } from "../components/landing/LandingBento";
import LandingMission from "../components/landing/LandingMission";
import {
  LandingWhyUs,
  LandingAbout,
  LandingHow,
  LandingTestimonials,
  LandingStrategic,
  LandingIELTS,
  LandingWhyForYou,
} from "../components/landing/LandingSections";
import LandingPricing from "../components/landing/LandingPricing";
import { LandingFaq, LandingCta, LandingFooter } from "../components/landing/LandingClosing";

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="landing-page">
      <LandingStyles />
      <LandingNav user={user} />
      <LandingHero user={user} />
      <LandingStats />
      <LandingBento />

      {/* ─── PRODUCT TOUR ─── */}
      <section className="lp-section" style={{
        background: "linear-gradient(180deg, var(--bg), rgb(var(--primary-rgb) / 0.05), var(--bg))",
      }}>
        <div className="lp-container">
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 className="lp-h2">See What's <span className="lp-gradient-text">Inside</span></h2>
            <p className="lp-sub">Explore the features that help thousands of students pass their exams.</p>
          </div>
          <ImageCarousel autoPlay={true} interval={4000} />
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-glass" style={{
            padding: "26px 24px", borderRadius: 18, display: "flex",
            alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap",
            border: "1px solid rgb(var(--primary-rgb) / 0.25)",
            background: "linear-gradient(120deg, rgb(var(--primary-rgb) / 0.10), rgb(var(--accent-rgb) / 0.06))",
          }}>
            <div style={{ maxWidth: 560 }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: "var(--primary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
                No signup needed
              </div>
              <h3 style={{ fontSize: "clamp(1.2rem, 3vw, 1.6rem)", fontWeight: 900, margin: "0 0 6px" }}>
                Try 3 real exam questions right now
              </h3>
              <p style={{ color: "var(--text-muted)", margin: 0, fontSize: 14, lineHeight: 1.6 }}>
                See the question quality and AI explanations for yourself — then create a free account to keep going.
              </p>
            </div>
            <Link to="/demo" className="lp-btn-primary" style={{ flexShrink: 0 }}>
              Start the free demo
            </Link>
          </div>
        </div>
      </section>

      <LandingHow />
      <LandingMission />
      <LandingStrategic />
      <LandingIELTS />
      <LandingWhyForYou />
      <LandingWhyUs />
      <LandingAbout />
      <LandingTestimonials />
      <LandingPricing />
      <LandingFaq />
      <LandingCta user={user} />
      <LandingFooter />
    </div>
  );
}
