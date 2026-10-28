import { useState, useEffect } from "react";
import { HelpCircle, X, ChevronRight, ChevronLeft } from "lucide-react";
import { useLocation } from "react-router-dom";
import { PAGE_TOURS } from "../data/pageTours";

export default function ContextualHelp() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const tour = PAGE_TOURS[location.pathname];

  useEffect(() => {
    setStep(0);
    setOpen(false);
  }, [location.pathname]);

  if (!tour) return null;

  const currentStep = tour.steps[step];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ position: "fixed", bottom: 80, right: 16, zIndex: 60, width: 40, height: 40, borderRadius: "50%", background: "var(--primary)", border: "none", color: "var(--text)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgb(var(--primary-rgb) / 0.4)" }}
        title={`Help: ${tour.title}`}
      >
        <HelpCircle size={20} />
      </button>

      {open && (
        <div style={{ position: "fixed", bottom: 128, right: 16, zIndex: 60, width: 300, background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>{currentStep?.title}</span>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
              <X size={16} />
            </button>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.5, margin: "0 0 12px" }}>{currentStep?.content}</p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{step + 1} / {tour.steps.length}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setStep(Math.max(0, step - 1))}
                disabled={step === 0}
                style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-3)", color: "var(--text)", cursor: step === 0 ? "not-allowed" : "pointer", opacity: step === 0 ? 0.4 : 1, fontSize: 11 }}
              >
                <ChevronLeft size={12} />
              </button>
              <button
                onClick={() => {
                  if (step < tour.steps.length - 1) setStep(step + 1);
                  else setOpen(false);
                }}
                style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "var(--primary)", color: "var(--text)", cursor: "pointer", fontSize: 11, fontWeight: 600 }}
              >
                {step < tour.steps.length - 1 ? <ChevronRight size={12} /> : "Done"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
