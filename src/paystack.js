// src/paystack.js - Rock-solid Paystack loader

let loaded = false;
let loading = false;
let callbacks = [];

export function loadPaystack() {
  return new Promise((resolve, reject) => {
    // Already loaded
    if (loaded && window.PaystackPop) {
      resolve(window.PaystackPop);
      return;
    }

    // Already loading - queue this request
    if (loading) {
      callbacks.push({ resolve, reject });
      return;
    }

    loading = true;
    callbacks = [];

    // Check if script tag already exists
    const existing = document.querySelector('script[data-paystack="true"]');
    if (existing) {
      // Wait for it
      const check = setInterval(() => {
        if (window.PaystackPop && window.PaystackPop.setup) {
          clearInterval(check);
          clearTimeout(timeout);
          loaded = true;
          loading = false;
          resolve(window.PaystackPop);
          callbacks.forEach(cb => cb.resolve(window.PaystackPop));
          callbacks = [];
        }
      }, 100);

      const timeout = setTimeout(() => {
        clearInterval(check);
        loading = false;
        callbacks.forEach(cb => cb.reject(new Error("Paystack load timeout")));
        callbacks = [];
        reject(new Error("Paystack took too long to load. Check your connection."));
      }, 15000);
      return;
    }

    // Create script
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.setAttribute("data-paystack", "true");

    const timeout = setTimeout(() => {
      loading = false;
      callbacks.forEach(cb => cb.reject(new Error("Paystack took too long to load. Check your connection.")));
      callbacks = [];
      reject(new Error("Paystack took too long to load. Check your connection."));
    }, 15000);

    script.onload = () => {
      clearTimeout(timeout);
      // Wait a tick for the script to fully initialize
      setTimeout(() => {
        if (window.PaystackPop && typeof window.PaystackPop.setup === "function") {
          loaded = true;
          loading = false;
          resolve(window.PaystackPop);
          callbacks.forEach(cb => cb.resolve(window.PaystackPop));
          callbacks = [];
        } else {
          loading = false;
          const err = new Error("Paystack failed to initialize. Try refreshing.");
          callbacks.forEach(cb => cb.reject(err));
          callbacks = [];
          reject(err);
        }
      }, 200);
    };

    script.onerror = () => {
      clearTimeout(timeout);
      loading = false;
      // Remove the dead tag so the next attempt re-creates it instead of
      // polling a failed script forever.
      script.remove();
      const err = new Error("Failed to load Paystack script. Check your connection.");
      callbacks.forEach(cb => cb.reject(err));
      callbacks = [];
      reject(err);
    };

    document.head.appendChild(script);
  });
}

export function openPaystack({ key, email, amount, ref, currency, metadata, onSuccess, onClose }) {
  return new Promise((resolve, reject) => {
    (async () => {
      try {
        const PaystackPop = await loadPaystack();

        if (!PaystackPop || typeof PaystackPop.setup !== "function") {
          reject(new Error("Paystack is not available. Please refresh and try again."));
          return;
        }

        const handler = PaystackPop.setup({
          key: key,
          email: email,
          amount: amount,
          ref: ref,
          currency: currency || "NGN",
          metadata: metadata || {},
          callback: async function(response) {
            // Await activation before resolving — otherwise the caller re-enables
            // its Pay button while the purchase is still being processed.
            try {
              if (onSuccess) await onSuccess(response);
            } catch (err) {
              console.error("Paystack callback error:", err);
              reject(err);
              return;
            }
            resolve(response);
          },
          onClose: function() {
            if (onClose) onClose();
            reject(new Error("Payment cancelled"));
          }
        });

        if (handler && typeof handler.openIframe === "function") {
          handler.openIframe();
        } else {
          reject(new Error("Failed to open payment window. Try again."));
        }
      } catch (err) {
        reject(err);
      }
    })();
  });
}
