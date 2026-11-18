import { useEffect, useState } from "react";

export function useServiceWorkerUpdate() {
  const [waiting, setWaiting] = useState(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let reg = null;

    function onChange(registration) {
      if (registration.waiting) setWaiting(registration.waiting);
    }

    navigator.serviceWorker.ready.then((registration) => {
      reg = registration;
      registration.addEventListener("updatefound", () => {
        const sw = registration.installing;
        if (sw) {
          sw.addEventListener("statechange", () => {
            if (sw.state === "installed" && navigator.serviceWorker.controller) {
              setWaiting(sw);
            }
          });
        }
      });
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });

    return () => {
      if (reg) {
        reg.removeEventListener("updatefound", onChange);
      }
    };
  }, []);

  async function skipWaiting() {
    if (!waiting) return;
    waiting.postMessage({ type: "SKIP_WAITING" });
    await navigator.serviceWorker.ready;
    window.location.reload();
  }

  return { updateAvailable: !!waiting, applyUpdate: skipWaiting };
}
