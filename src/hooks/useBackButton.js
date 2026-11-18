// useBackButton — Android PWA "double-tap back to exit" + sane in-app back.
//
// React Router v7 has no history.state.__depth, so depth is tracked from
// navigation types (PUSH +1 / POP -1 / REPLACE unchanged, floored at 0).
// A guard entry is maintained on top of the stack ONLY at depth 0, and the
// location effect is the SOLE owner of pushing it (prevents double-guards).
import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { useToast } from "../components/Toast";

const EXIT_WINDOW_MS = 1500;

export function useBackButton({ enabled = true } = {}) {
  const location = useLocation();
  const navType = useNavigationType();
  const { toast } = useToast();
  const depthRef = useRef(0);
  const guardRef = useRef(false);
  const armedAtRef = useRef(0);
  const toastRef = useRef(toast);

  // Keep the latest toast fn without re-subscribing the popstate listener.
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  // Track depth + own the guard entry
  useEffect(() => {
    if (!enabled) return;

    if (navType === "PUSH") {
      depthRef.current += 1;
    } else if (navType === "POP") {
      depthRef.current = Math.max(0, depthRef.current - 1);
    } else if (navType === "REPLACE") {
      // A replace destroys whatever entry was on top (possibly our guard)
      guardRef.current = false;
    }

    // Buried-guard skip: a POP that lands on a guard entry means the user
    // went back from a deeper page onto the trap — skip straight through to
    // the real page below instead of stranding them on the guard.
    if (navType === "POP") {
      try {
        if (window.history.state && window.history.state.epExitGuard) {
          guardRef.current = false;
          window.history.back();
          return;
        }
      } catch (_) {
        // history access restricted — ignore
      }
    }

    // Sole owner of guard pushing: reset, then push only at root
    guardRef.current = false;
    if (depthRef.current === 0) {
      try {
        window.history.pushState({ epExitGuard: true }, "");
        guardRef.current = true;
      } catch (_) {
        // non-browser / restricted context — skip silently
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key, enabled]);

  // Handle guard pops (registered once)
  useEffect(() => {
    if (!enabled) return;

    function onPopState() {
      // Only our guard matters: at root with an active guard, any back press
      // just popped it.
      if (depthRef.current !== 0 || !guardRef.current) return;
      guardRef.current = false; // guard consumed

      const now = Date.now();
      if (now - armedAtRef.current < EXIT_WINDOW_MS) {
        // Second press inside the window — leave the app (PWA closes /
        // browser goes back past the app entry).
        armedAtRef.current = 0;
        window.history.back();
      } else {
        // First press — warn, arm the window. The location effect re-pushes
        // the guard since depth is 0 and no guard is active.
        armedAtRef.current = now;
        try {
          toastRef.current({ message: "Tap back again to exit", type: "info" });
        } catch (_) {
          // toast unavailable — ignore
        }
      }
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [enabled]);
}
