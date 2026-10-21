import { useState, useEffect, useCallback } from "react";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { app_meta, db } from "../firebaseConfig";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

const STORAGE_KEY = "ep_reminders";
const ICON = "/icons/icon-192.png";

function getStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setStorage(reminders) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders)); } catch { /* private mode */ }
}

function generateId() {
  return `rem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function currentPermission() {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

export function useNotifications() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState(() => getStorage());
  const [permission, setPermission] = useState(currentPermission);

  const registerPush = useCallback(async () => {
    if (!user?.uid || typeof window === "undefined") return null;
    try {
      const supported = await isSupported().catch(() => false);
      if (!supported) return null;
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      if (!vapidKey) return null;
      const registration = await navigator.serviceWorker?.ready;
      const messaging = getMessaging(app_meta);
      const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
      if (!token) return null;
      await setDoc(doc(db, "users", user.uid, "pushTokens", token), {
        token,
        platform: /iphone|ipad|ipod/i.test(navigator.userAgent) ? "ios" : "web",
        updatedAt: serverTimestamp(),
      }, { merge: true });
      return token;
    } catch (e) {
      console.warn("Push registration skipped:", e?.message);
      return null;
    }
  }, [user?.uid]);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") {
      setPermission("unsupported");
      return "unsupported";
    }
    let result = Notification.permission;
    if (result === "default") {
      try { result = await Notification.requestPermission(); } catch { result = "denied"; }
    }
    setPermission(result);
    if (result === "granted") await registerPush();
    return result;
  }, [registerPush]);

  // Register silently when permission was already granted; never auto-prompt.
  useEffect(() => {
    if (permission === "granted") registerPush();
  }, [permission, registerPush]);

  // Foreground FCM messages.
  useEffect(() => {
    if (permission !== "granted") return;
    let unsub = null;
    (async () => {
      try {
        const supported = await isSupported().catch(() => false);
        if (!supported) return;
        const messaging = getMessaging(app_meta);
        unsub = onMessage(messaging, (payload) => {
          const title = payload.notification?.title || "ExamPadi";
          const body = payload.notification?.body || "";
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification(title, { body, icon: ICON, badge: ICON, tag: payload.data?.id || "general" });
          }
        });
      } catch { /* ignore */ }
    })();
    return () => { if (typeof unsub === "function") unsub(); };
  }, [permission]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const current = getStorage();
      const due = current.filter((r) => !r.fired && r.time <= now);
      if (due.length === 0) return;
      due.forEach((r) => {
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification(r.title, {
            body: r.body,
            icon: ICON,
            badge: ICON,
            tag: r.id,
            vibrate: [200, 100, 200],
          });
        }
        r.fired = true;
      });
      setStorage(current);
      setReminders([...current]);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const sendNotification = useCallback((title, body) => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") {
      requestPermission();
      return;
    }
    new Notification(title, {
      body,
      icon: ICON,
      badge: ICON,
      tag: "general",
      vibrate: [200, 100, 200],
    });
  }, [requestPermission]);

  const scheduleReminder = useCallback((time, title, body) => {
    const id = generateId();
    const reminder = { id, title, body, time, fired: false, createdAt: Date.now() };
    const current = getStorage();
    current.push(reminder);
    setStorage(current);
    setReminders([...current]);
    return id;
  }, []);

  const getReminders = useCallback(() => getStorage(), []);

  const clearReminder = useCallback((id) => {
    const current = getStorage().filter((r) => r.id !== id);
    setStorage(current);
    setReminders([...current]);
  }, []);

  return {
    permission,
    requestPermission,
    registerPush,
    sendNotification,
    scheduleReminder,
    getReminders,
    clearReminder,
    reminders,
  };
}
