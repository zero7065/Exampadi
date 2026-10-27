import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  deleteUser,
} from "firebase/auth";
import { auth, db, signInWithGoogle as firebaseGoogleSignIn } from "../firebaseConfig";
import { doc, setDoc, serverTimestamp, getDoc, runTransaction } from "firebase/firestore";
import { logActivity } from "../lib/activityLog";
import { onConnectionChange, startConnectionMonitor } from "../lib/connectionHealth";
import { flushQueue } from "../lib/offlineQueue";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileVersion, setProfileVersion] = useState(0);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [degraded, setDegraded] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Partial-connectivity monitor (auth works, sync blocked)
  useEffect(() => {
    const offChange = onConnectionChange((next) => {
      setDegraded(next);
      // When hosts come back, flush queued writes and re-arm auth
      if (!next) {
        flushQueue().catch(() => {});
      }
    });
    const stopMonitor = startConnectionMonitor();
    return () => {
      offChange();
      stopMonitor();
    };
  }, []);

  useEffect(() => {
    let timeout;
    let retryCount = 0;
    let unsubscribe;
    let cancelled = false;
    const MAX_RETRIES = 3;

    function startAuthListener() {
      if (!auth) { setLoading(false); return; }
      timeout = setTimeout(() => {
        if (cancelled) return;
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          console.warn(`Auth state listener timed out, retry ${retryCount}/${MAX_RETRIES}`);
          // Clean up previous listener before retrying
          if (unsubscribe) unsubscribe();
          startAuthListener();
        } else {
          console.warn("Auth state listener: max retries reached, proceeding offline");
          setLoading(false);
        }
      }, 8000);

      unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        clearTimeout(timeout);
        if (cancelled) return;
        setUser(firebaseUser);
        setLoading(false);
        retryCount = 0;
      }, (error) => {
        clearTimeout(timeout);
        if (cancelled) return;
        const code = error?.code || "";
        if (retryCount < MAX_RETRIES && (code === "auth/network-request-failed" || code === "auth/invalid-credential" || code === "auth/too-many-requests")) {
          retryCount++;
          console.warn(`Retrying auth listener (${retryCount}/${MAX_RETRIES})... code: ${code}`);
          setTimeout(() => {
            if (!cancelled) {
              if (unsubscribe) unsubscribe();
              startAuthListener();
            }
          }, 2000 * retryCount);
        } else if (code === "auth/invalid-credential" || code === "auth/user-disabled") {
          console.warn("Auth token invalid — signing out");
          signOut(auth).catch(() => {});
          setUser(null);
          setLoading(false);
        } else {
          setLoading(false);
        }
      });
    }

    startAuthListener();

    // When connectivity returns, reset retries and re-subscribe the auth listener
    // (Firebase may have dropped the stream mid-outage, and retryCount may be exhausted)
    function handleReconnect() {
      retryCount = 0;
      if (unsubscribe) {
        try { unsubscribe(); } catch (_) {}
      }
      startAuthListener();
    }
    window.addEventListener("online", handleReconnect);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      if (unsubscribe) unsubscribe();
      window.removeEventListener("online", handleReconnect);
    };
  }, []);

  async function register(email, password, name, options = {}) {
    let cred;
    try {
      cred = await createUserWithEmailAndPassword(auth, email, password);
    } catch (e) {
      if (e.code === 'auth/network-request-failed') {
        await new Promise(r => setTimeout(r, 2000));
        try {
          cred = await createUserWithEmailAndPassword(auth, email, password);
        } catch (retryErr) {
          throw new Error("Cannot reach Firebase — your network is blocking Google services. Try mobile data or a different WiFi. Use the Network Diagnostic button for details.");
        }
      } else if (e.code === 'auth/configuration-not-found' || e.code === 'auth/operation-not-allowed') {
        throw new Error("Firebase Email/Password auth is not enabled. Go to Firebase Console → Authentication → Sign-in method → enable Email/Password.");
      } else if (e.code === 'auth/email-already-in-use') {
        throw e;
      } else {
        throw e;
      }
    }

    const username = options.username || cred.user.email?.split("@")[0] || "student";
    const schoolCode = options.schoolCode;

    try {
      await updateProfile(cred.user, { displayName: name });

      let orgId = null;
      let role = "user";

      // Transactional school code redemption
      if (schoolCode) {
        const codeRef = doc(db, "teacherCodes", schoolCode.toUpperCase());
        await runTransaction(db, async (transaction) => {
          const codeSnap = await transaction.get(codeRef);
          if (!codeSnap.exists()) throw new Error("USERNAME_TAKEN"); // reuse for invalid code
          const codeData = codeSnap.data();
          if (codeData.status !== "active") throw new Error("CODE_REVOKED");
          if (codeData.usedSeats >= codeData.seatCap) throw new Error("SEATS_FULL");
          const now = new Date();
          if (codeData.expiresAt && new Date(codeData.expiresAt.toDate ? codeData.expiresAt.toDate() : codeData.expiresAt) <= now) {
            throw new Error("CODE_EXPIRED");
          }
          orgId = codeData.orgId;
          role = "student";
          transaction.update(codeRef, { usedSeats: codeData.usedSeats + 1 });
        });
      }

      const isAdminEmail = email === "jadai7065@gmail.com";
      if (isAdminEmail) role = "admin";

      // Generate 6-digit recovery PIN
      const recoveryPin = Math.floor(100000 + Math.random() * 900000).toString();

      await setDoc(doc(db, "users", cred.user.uid), {
        email,
        name,
        username: username.toLowerCase(),
        role,
        orgId: orgId || null,
        schoolCode: schoolCode || null,
        exam: null,
        subjects: [],
        onboarded: false,
        createdAt: serverTimestamp(),
        recoveryPinHash: recoveryPin, // In production, hash this
        recoveryPinCreatedAt: serverTimestamp(),
      }, { merge: true });

      // Show PIN to user once (handled by toast in AuthPage)
      window._examPadiPin = recoveryPin;

    } catch (e) {
      if (e.code === "SEATS_FULL" || e.code === "CODE_EXPIRED" || e.code === "CODE_REVOKED" || e.code === "USERNAME_TAKEN") {
        throw e;
      }
      console.warn("Profile write failed:", e.code);
      if (e.code !== "permission-denied" && e.code !== "unavailable") {
        try { await deleteUser(cred.user); } catch (_) {}
        throw new Error("Failed to create profile. Please try again.");
      }
    }
    setUser({ ...cred.user, displayName: name });
    logActivity({ action: "register", userId: cred.user.uid, email, details: { name, schoolCode } });
  }

  async function login(email, password) {
    let cred;
    try {
      cred = await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      if (e.code === 'auth/network-request-failed') {
        // Retry once after brief delay
        await new Promise(r => setTimeout(r, 2000));
        try {
          cred = await signInWithEmailAndPassword(auth, email, password);
        } catch (retryErr) {
          throw new Error("Cannot reach Firebase — your network is blocking Google services. Try mobile data or a different WiFi. Use the Network Diagnostic button for details.");
        }
      } else if (e.code === 'auth/configuration-not-found' || e.code === 'auth/operation-not-allowed') {
        throw new Error("Firebase Email/Password auth is not enabled. Go to Firebase Console → Authentication → Sign-in method → enable Email/Password.");
      } else {
        throw e;
      }
    }
    logActivity({ action: "login", userId: cred.user.uid, email });
  }

  async function signInWithGoogle() {
    let result;
    try {
      result = await firebaseGoogleSignIn();
    } catch (e) {
      if (e.code === 'auth/popup-closed-by-user') {
        throw new Error("Sign-in cancelled");
      }
      if (e.code === 'auth/configuration-not-found' || e.code === 'auth/operation-not-allowed') {
        throw new Error("Google sign-in is not enabled. Go to Firebase Console → Authentication → Sign-in method → enable Google.");
      }
      if (e.code === 'auth/network-request-failed' || e.message?.includes('network')) {
        throw new Error("Cannot reach Firebase — your network is blocking Google services. Try mobile data or a different WiFi.");
      }
      throw e;
    }
    const googleUser = result.user;
    const userDocRef = doc(db, "users", googleUser.uid);
    const existingDoc = await getDoc(userDocRef).catch(() => null);
    if (!existingDoc || !existingDoc.exists()) {
      try {
        await setDoc(userDocRef, {
          email: googleUser.email,
          name: googleUser.displayName || "",
          role: "user",
          exam: null,
          subjects: [],
          onboarded: false,
          createdAt: serverTimestamp(),
        }, { merge: true });
      } catch (e) {
        console.warn("Google profile creation failed:", e?.message);
      }
    }
    logActivity({ action: "register", userId: googleUser.uid, email: googleUser.email, details: { name: googleUser.displayName, provider: "google" } });
    setUser({ ...googleUser, displayName: googleUser.displayName });
  }

  async function logout() {
    const uid = auth.currentUser?.uid;
    const email = auth.currentUser?.email;
    try {
      await signOut(auth);
      if (uid) logActivity({ action: "logout", userId: uid, email });
    } catch (e) {
      console.error("Logout error:", e);
    }
    setUser(null);
  }

  useEffect(() => {
    let consecutiveAuthFailures = 0;
    let lastReload = 0;
    // Only react to real Firebase auth error codes — substring matching on
    // "auth"/"token" catches unrelated rejections and signs users out for nothing.
    const RECOVERABLE = new Set([
      "auth/invalid-refresh-token",
      "auth/user-token-expired",
      "auth/user-disabled",
      "auth/invalid-credential",
      "auth/network-request-failed",
      "auth/quota-exceeded",
      "TOKEN_REFRESH_FAILED",
    ]);
    function extractCode(e) {
      const code = e?.code || e?.error?.code || "";
      if (RECOVERABLE.has(code)) return code;
      const msg = String(e?.message || e?.reason?.message || e?.error?.message || "");
      const m = msg.match(/auth\/[a-z-]+/);
      if (m && RECOVERABLE.has(m[0])) return m[0];
      if (/refresh.?token/i.test(msg)) return "TOKEN_REFRESH_FAILED";
      return null;
    }
    const onErr = (e) => {
      const code = extractCode(e);
      if (!code) return;
      // Transient network failures never force a sign-out — Firestore would then
      // evaluate rules with request.auth == null and throw permission errors.
      if (code === "auth/network-request-failed") return;
      const now = Date.now();
      if (now - lastReload > 30000) consecutiveAuthFailures = 0;
      consecutiveAuthFailures++;
      if (consecutiveAuthFailures >= 3) {
        consecutiveAuthFailures = 0;
        lastReload = now;
        window.location.reload();
      } else if (code === "auth/invalid-credential" || code === "auth/user-token-expired" || code === "auth/invalid-refresh-token") {
        signOut(auth).catch(() => {});
        setUser(null);
      }
      // decay after 30s of quiet so unrelated errors never accumulate
      setTimeout(() => {
        if (Date.now() - lastReload > 30000) consecutiveAuthFailures = 0;
      }, 30000);
    };
    window.addEventListener("unhandledrejection", onErr);
    return () => window.removeEventListener("unhandledrejection", onErr);
  }, []);

  async function resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        throw new Error("No account found with this email");
      }
      if (e.code === 'auth/configuration-not-found' || e.code === 'auth/operation-not-allowed') {
        throw new Error("Firebase Email/Password auth is not enabled. Go to Firebase Console → Authentication → Sign-in method → enable Email/Password.");
      }
      throw new Error("Failed to send reset email. Check your email address and try again.");
    }
  }

  function findUserByEmail(email) {
    if (user && user.email === email) return user;
    return null;
  }

  async function refreshProfile() {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setUser({ ...auth.currentUser });
    }
    setProfileVersion(v => v + 1);
  }

  function updateUser(data) {
    if (user) setUser({ ...user, ...data });
  }

  function isPro() {
    return user?.plan === "pro" && user?.planExpiry && new Date(user.planExpiry) > new Date();
  }

  function getUserRole() {
    return user?.role || "user";
  }

  const ctxValue = useMemo(() => ({
    user, loading, login, signInWithGoogle, register, logout, resetPassword,
    findUserByEmail, refreshProfile, updateUser, profileVersion, isPro, getUserRole, isOffline,
    degraded,
    getRecoveryPin: () => window._examPadiPin || null,
    clearRecoveryPin: () => { window._examPadiPin = null; },
  }), [user, loading, profileVersion, isOffline, degraded]);

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        flexDirection: "column",
        gap: 16,
      }}>
        <div style={{
          width: 36,
          height: 36,
          border: "3px solid var(--border)",
          borderTopColor: "var(--primary)",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
        <p style={{ color: "var(--text-muted)", fontFamily: "system-ui, sans-serif", fontSize: 15 }}>
          Loading ExamPadi...
        </p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={ctxValue}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
