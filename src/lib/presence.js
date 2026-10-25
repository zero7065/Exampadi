// src/lib/presence.js
// Real-time presence tracking for users across different sessions
import { ref, onValue, query, orderByChild, limitToLast } from "firebase/database";
import { database } from "../firebaseConfig";

// State management for presence
let presenceTracker = new Map();
let onlineUsers = new Map();
let presenceListeners = [];

// Convert timestamp to readable format
export function formatTimeAgo(timestamp) {
  if (!timestamp) return "unknown";

  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60000) {
    return "just now";
  }

  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    return `${weeks}w ago`;
  }

  const months = Math.floor(days / 30);
  return `${months}m ago`;
}

// Check if user is currently online
export function isOnline(presenceData) {
  if (!presenceData || !presenceData.state) return false;

  const now = Date.now();
  const lastActivity = presenceData.timestamp || 0;
  const timeSinceLastActivity = now - lastActivity;

  return timeSinceLastActivity < 180000; // 3 minutes
}

// Subscribe to presence changes
export function subscribePresence(callback) {
  if (!database) {
    console.warn("Database not available for presence tracking");
    return () => {};
  }

  const presenceRef = ref(database, "presence");
  const onlineRef = query(ref(database, "presence/online"), orderByChild("timestamp"), limitToLast(100));

  const presenceHandler = (snapshot) => {
    const presenceData = snapshot.val() || {};
    presenceTracker = new Map(Object.entries(presenceData));
    updateOnlineUsers();
  };

  const onlineHandler = (snapshot) => {
    const onlineData = snapshot.val() || {};
    onlineUsers = new Map(Object.entries(onlineData));
    updateOnlineUsers();
  };

  const presenceUnsub = onValue(presenceRef, presenceHandler);
  const onlineUnsub = onValue(onlineRef, onlineHandler);

  presenceListeners.push({
    presenceUnsub,
    onlineUnsub,
    callback,
  });

  // Return initial state
  updateOnlineUsers();

  return () => {
    presenceUnsub();
    onlineUnsub();
    const index = presenceListeners.findIndex(l => l === presenceListeners[presenceListeners.length - 1]);
    if (index !== -1) {
      presenceListeners.splice(index, 1);
    }
  };
}

function updateOnlineUsers() {
  const allUsers = new Map([...presenceTracker, ...onlineUsers]);
  const onlineUserList = Array.from(allUsers.entries())
    .filter(([uid, data]) => isOnline(data))
    .sort((a, b) => {
      const aTime = a[1]?.timestamp || 0;
      const bTime = b[1]?.timestamp || 0;
      return bTime - aTime;
    });

  presenceListeners.forEach(listener => {
    if (listener.callback) {
      listener.callback(onlineUserList.map(([uid, data]) => ({
        uid,
        ...data,
      })));
    }
  });
}

// Track user presence
export function trackPresence(uid, userData = {}) {
  if (!database || !uid) return () => {};

  const presenceRef = ref(database, `presence/${uid}`);

  const presenceData = {
    ...userData,
    state: "online",
    timestamp: Date.now(),
    lastSeen: formatTimeAgo(Date.now()),
  };

  const updatePresence = (state = "online") => {
    presenceData.state = state;
    presenceData.timestamp = Date.now();
    presenceData.lastSeen = formatTimeAgo(Date.now());

    const updateRef = ref(database, `presence/${uid}`);
    const updateData = { ...presenceData };
    if (state === "offline") {
      delete updateData.state;
    }
    return import("firebase/database").then(({ update }) => update(updateRef, updateData));
  };

  // Initialize presence
  import("firebase/database").then(({ set }) => {
    set(presenceRef, presenceData);
  });

  // Set up heartbeat
  const heartbeat = setInterval(() => {
    import("firebase/database").then(({ update }) => {
      update(presenceRef, {
        timestamp: Date.now(),
        lastSeen: formatTimeAgo(Date.now()),
      });
    });
  }, 30000);

  // Handle page unload
  const handleUnload = () => {
    updatePresence("offline");
  };

  window.addEventListener("beforeunload", handleUnload);

  return () => {
    clearInterval(heartbeat);
    window.removeEventListener("beforeunload", handleUnload);
    updatePresence("offline");
  };
}

// Get online users list
export function getOnlineUsers() {
  return Array.from(onlineUsers.entries()).map(([uid, data]) => ({
    uid,
    ...data,
  }));
}

// Get specific user presence
export function getUserPresence(uid) {
  return presenceTracker.get(uid) || onlineUsers.get(uid) || null;
}

// Clear all listeners (useful for cleanup)
export function clearPresenceListeners() {
  presenceListeners.forEach(listener => {
    if (listener.presenceUnsub) listener.presenceUnsub();
    if (listener.onlineUnsub) listener.onlineUnsub();
  });
  presenceListeners = [];
}