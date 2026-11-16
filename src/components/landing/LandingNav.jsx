// Landing nav — glass bar with working mobile hamburger.
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Menu, X } from "lucide-react";
import Logo from "../Logo";

const LINKS = ["Features", "Why Us", "Mission", "Pricing", "FAQ"];

function slug(s) {
  return s.toLowerCase().replace(/\s+/g, "-");
}

export default function LandingNav({ user }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="lp-glass" style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
      borderLeft: "none", borderRight: "none", borderTop: "none",
    }}>
      <div className="lp-container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 72 }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}><Logo size={36} radius={10} /></div>
          <span style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>
            ExamPadi
            <span className="brand-shimmer-full" style={{ fontSize: 9, marginLeft: 8, letterSpacing: "0.08em", verticalAlign: "super" }}>by Jadai</span>
          </span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="lp-nav-links" style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {LINKS.map((item) => (
              <a key={item} href={`#${slug(item)}`} style={{
                padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 500,
                color: "var(--text-muted)", textDecoration: "none", transition: "all 0.2s",
              }}
                onMouseOver={(e) => { e.currentTarget.style.background = "rgb(var(--primary-rgb) / 0.1)"; e.currentTarget.style.color = "var(--text)"; }}
                onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
              >{item}</a>
            ))}
          </div>
          <Link to="/teacher/register" style={{ padding: "10px 16px", fontSize: 14, fontWeight: 700, color: "var(--accent)", textDecoration: "none", borderRadius: 10, border: "1px solid rgb(var(--accent-rgb) / 0.35)", background: "rgb(var(--accent-rgb) / 0.08)" }}>
            For Teachers
          </Link>
          <Link to={user ? "/dashboard" : "/auth"} className="lp-btn-primary" style={{ padding: "10px 24px", fontSize: 14 }}>
            {user ? "Dashboard" : "Sign In"} <ArrowRight size={16} />
          </Link>
          <button
            className="lp-hamburger"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu"
            style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 10, padding: 8, color: "var(--text)", cursor: "pointer" }}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="lp-mobile-menu lp-glass" style={{ borderLeft: "none", borderRight: "none", padding: "8px 24px 20px", display: "flex", flexDirection: "column", gap: 4 }}>
          {LINKS.map((item) => (
            <a key={item} href={`#${slug(item)}`} onClick={() => setMenuOpen(false)} style={{
              padding: "12px 8px", fontSize: 15, fontWeight: 600, color: "var(--text)",
              textDecoration: "none", borderBottom: "1px solid var(--border)",
            }}>{item}</a>
          ))}
          <Link to="/teacher/register" onClick={() => setMenuOpen(false)} style={{ padding: "12px 8px", fontSize: 15, fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>
            👩‍🏫 For Teachers
          </Link>
        </div>
      )}
    </nav>
  );
}
