/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext();

const typeColors = {
  success: "var(--success)",
  error: "#FF4D6A",
  warning: "#FF9F43",
  info: "var(--primary)",
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback(({ message, type = "info", duration = 3000 }) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-stack" style={{
        position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
        zIndex: 9999, display: "flex", flexDirection: "column", gap: 8,
        maxWidth: 400, width: "calc(100vw - 48px)",
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: "var(--bg-3)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "12px 18px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            boxShadow: "var(--card-shadow)",
            animation: "toastSlideUp 0.25s ease",
            color: "var(--text)",
            fontSize: 14,
            fontFamily: "system-ui, sans-serif",
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: typeColors[t.type], flexShrink: 0,
            }} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toastSlideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
