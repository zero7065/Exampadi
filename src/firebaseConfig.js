// src/firebaseConfig.js — Real Firebase SDK
// Replaces the localStorage shim. All existing imports work unchanged.

import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  deleteUser,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  increment,
  serverTimestamp,
  arrayUnion,
  initializeFirestore,
  persistentLocalCache,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ─── Firebase Config ───
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const isConfigured =
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== "your_firebase_api_key" &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== "your_project_id";

// Initialize immediately — app will be null if not configured
let app = null;
let _auth = null;
let _db = null;

if (isConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    _auth = getAuth(app);
    // Remember Gmail/password sessions across reloads and browser restarts.
    setPersistence(_auth, browserLocalPersistence).catch((e) => {
      console.warn("Auth persistence unavailable:", e?.message);
    });
    // Use new cache API (replaces deprecated enableIndexedDbPersistence)
    try {
      _db = initializeFirestore(app, { localCache: persistentLocalCache() });
    } catch {
      // Fallback if persistentLocalCache not supported
      _db = getFirestore(app);
    }
  } catch (e) {
    console.error("Firebase init failed:", e);
  }
} else {
  console.warn(
    "Firebase not configured — add real values to .env. Auth & Firestore will be unavailable."
  );
}

// ─── Always export (even if null) ───
export const auth = _auth;
export const db = _db;

// Firebase Storage (for admin-managed landing media). Lazily created so the
// storage SDK is only loaded when actually used.
let _storage = null;
export function getAppStorage() {
  if (_storage) return _storage;
  if (!app) throw new Error("Firebase not configured");
  _storage = getStorage(app);
  return _storage;
}

// Re-export Firestore functions directly
export { doc, collection, getDoc, getDocs, setDoc, updateDoc, addDoc, deleteDoc };
export { query, where, orderBy, limit, writeBatch, increment, serverTimestamp, arrayUnion };

// Re-export Auth functions directly
export { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword };
export { signOut, updateProfile, sendPasswordResetEmail, deleteUser };
export { GoogleAuthProvider, setPersistence, browserLocalPersistence };

// ─── Google sign-in helper ───
const _googleProvider = new GoogleAuthProvider();
export { _googleProvider as googleProvider };

export async function signInWithGoogle() {
  if (!_auth) throw new Error("Firebase not configured");
  return signInWithPopup(_auth, _googleProvider);
}

// ─── Admin auto-seed (credentials from env — never commit secrets) ───
const ADMIN_EMAIL = import.meta.env.VITE_SEED_ADMIN_EMAIL || "";
const ADMIN_PASSWORD = import.meta.env.VITE_SEED_ADMIN_PASSWORD || "";
const ADMIN_NAME = "Admin";

let _adminSeeded = false;
let _adminSeedAttempted = false;

export async function seedAdminAccount() {
  if (_adminSeeded || _adminSeedAttempted || !_auth || !_db) return;
  _adminSeedAttempted = true;

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    // No seed credentials configured — admin signs in with an existing account.
    // Set VITE_SEED_ADMIN_EMAIL / VITE_SEED_ADMIN_PASSWORD locally to auto-seed.
    return;
  }

  try {
    const cred = await createUserWithEmailAndPassword(_auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    try {
      await updateProfile(cred.user, { displayName: ADMIN_NAME }).catch(() => {});
      await setDoc(doc(_db, "users", cred.user.uid), {
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        role: "admin",
        exam: null,
        subjects: [],
        onboarded: true,
        createdAt: serverTimestamp(),
      }, { merge: true }).catch(() => {});
    } catch {
      // Firestore write failed, but auth user exists — that's fine
    }
    await signOut(_auth).catch(() => {});
    _adminSeeded = true;
  } catch (e) {
    if (e.code === "auth/email-already-in-use") {
      _adminSeeded = true;
    }
    // Silently skip — network may be down, admin can still sign in manually
  }
}

// ─── App metadata ───
export const app_meta = app;
export const isFirebaseConfigured = isConfigured;
