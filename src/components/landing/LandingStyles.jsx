// Shared theme-aware landing styles (replaces the old hardcoded-light block).
// All colors come from app CSS vars, so the landing follows the theme toggle.
export default function LandingStyles() {
  return (
    <style>{`
      .landing-page {
        font-family: 'Inter', system-ui, sans-serif;
        background: var(--bg);
        color: var(--text);
        overflow-x: hidden;
        scroll-behavior: smooth;
      }
      .landing-page * { box-sizing: border-box; }
      .landing-page section[id], .landing-page footer[id] { scroll-margin-top: 84px; }
      .lp-container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }

      @keyframes lpFadeUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .lp-animate-in { animation: lpFadeUp 0.6s ease forwards; opacity: 0; }
      .lp-delay-1 { animation-delay: 0.1s; }
      .lp-delay-2 { animation-delay: 0.2s; }
      .lp-delay-3 { animation-delay: 0.3s; }
      .lp-delay-4 { animation-delay: 0.4s; }
      .lp-delay-5 { animation-delay: 0.5s; }

      .lp-glass {
        background: rgb(var(--bg-2-rgb) / 0.72);
        backdrop-filter: blur(20px) saturate(1.4);
        -webkit-backdrop-filter: blur(20px) saturate(1.4);
        border: 1px solid rgb(var(--border-rgb) / 0.8);
      }

      .lp-bento-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
      .lp-bento-wide { grid-column: span 2; }
      .lp-bento-card {
        background: rgb(var(--bg-2-rgb) / 0.72);
        backdrop-filter: blur(20px) saturate(1.4);
        -webkit-backdrop-filter: blur(20px) saturate(1.4);
        border: 1px solid rgb(var(--border-rgb) / 0.8);
        border-radius: 20px;
        padding: 32px;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }
      .lp-bento-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 20px 60px rgba(0,0,0,0.12);
        border-color: rgb(var(--primary-rgb) / 0.6);
      }

      .lp-gradient-text {
        background: var(--landing-gradient);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .lp-section { padding: 80px 0; }
      .lp-h2 { font-size: 36px; font-weight: 900; letter-spacing: -0.03em; margin: 0 0 16px; }
      .lp-sub { font-size: 16px; color: var(--text-muted); max-width: 560px; margin: 0 auto; line-height: 1.7; }

      .lp-btn-primary {
        display: inline-flex; align-items: center; gap: 8px;
        padding: 16px 32px; border-radius: 14px; font-size: 16px; font-weight: 700;
        background: var(--landing-gradient); color: #04120D; text-decoration: none;
        box-shadow: 0 8px 32px rgb(var(--primary-rgb) / 0.35);
        transition: all 0.2s;
      }
      .lp-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgb(var(--primary-rgb) / 0.45); }
      .lp-btn-ghost {
        display: inline-flex; align-items: center; gap: 8px;
        padding: 16px 32px; border-radius: 14px; font-size: 16px; font-weight: 700;
        background: rgb(var(--bg-2-rgb) / 0.72); color: var(--text); text-decoration: none;
        border: 1px solid rgb(var(--border-rgb) / 0.8);
        transition: all 0.2s;
      }
      .lp-btn-ghost:hover { border-color: rgb(var(--primary-rgb) / 0.6); }

      /* Phone mockup frame (fallback when no screenshot is available) */
      .lp-phone {
        width: 260px; height: 540px; border-radius: 36px;
        background: var(--bg-3); border: 1px solid var(--border);
        box-shadow: 0 30px 80px rgba(0,0,0,0.25), inset 0 0 0 8px var(--bg-2);
        padding: 28px 16px; position: relative; overflow: hidden;
        margin: 0 auto;
      }
      .lp-phone-notch {
        position: absolute; top: 14px; left: 50%; transform: translateX(-50%);
        width: 100px; height: 22px; border-radius: 12px; background: var(--bg);
      }
      .lp-shot {
        width: 100%; border-radius: 20px; border: 1px solid rgb(var(--border-rgb) / 0.8);
        box-shadow: 0 24px 64px rgba(0,0,0,0.22); display: block;
      }

      @media (max-width: 768px) {
        .lp-bento-grid { grid-template-columns: 1fr; }
        .lp-bento-wide { grid-column: span 1; }
        .lp-section { padding: 48px 0; }
        .lp-container { padding: 0 16px; }
        .lp-h2 { font-size: 28px; }
        .lp-nav-links { display: none !important; }
        .lp-stats-grid { grid-template-columns: 1fr 1fr !important; gap: 20px !important; }
      }
      @media (min-width: 769px) {
        .lp-hamburger { display: none !important; }
        .lp-mobile-menu { display: none !important; }
      }
    `}</style>
  );
}
