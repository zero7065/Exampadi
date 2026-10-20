// src/ErrorBoundary.jsx
import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info?.componentStack || "");
  }

  handleClearAndReload() {
    try { localStorage.clear(); } catch { /* intentionally empty */ }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
    }
    window.location.reload();
  }

  render() {
    if (this.state.error) {
      const err = this.state.error;
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
          fontFamily: "'Inter', system-ui, sans-serif",
          padding: 24,
        }}>
          <div style={{ textAlign: "center", maxWidth: 520 }}>
            <div style={{ fontSize: 56, marginBottom: 16, lineHeight: 1 }}>⚠️</div>
            <h2 style={{ color: "#fff", fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
              Something went wrong
            </h2>
            <div style={{ color: "#FF6B6B", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
              {err.name || "Error"}
            </div>
            <pre style={{
              color: "#FF4D6A",
              fontSize: 13,
              marginBottom: 24,
              background: "var(--bg-3)",
              padding: "12px 16px",
              borderRadius: 8,
              fontFamily: "monospace",
              wordBreak: "break-word",
              overflow: "auto",
              maxWidth: 520,
              lineHeight: 1.5,
              textAlign: "left",
            }}>
              {err.message}
            </pre>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: "14px 32px",
                  borderRadius: 12,
                  background: "var(--primary)",
                  border: "none",
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: "pointer",
                  color: "#fff",
                  fontFamily: "inherit",
                }}
              >
                Reload App
              </button>
              <button
                onClick={this.handleClearAndReload}
                style={{
                  padding: "14px 32px",
                  borderRadius: 12,
                  background: "transparent",
                  border: "1px solid #FF4D6A",
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: "pointer",
                  color: "#FF4D6A",
                  fontFamily: "inherit",
                }}
              >
                Clear Cache & Reload
              </button>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 24, maxWidth: 400, lineHeight: 1.5 }}>
              If this keeps happening, try the "Clear Cache" button above, then enable Email/Password at{' '}
              <span style={{ color: "var(--accent)" }}>Firebase Console → Authentication → Sign-in providers</span>.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
