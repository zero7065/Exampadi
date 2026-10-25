// src/context/PresenceContext.jsx
import { createContext, useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { subscribePresence } from "../lib/presence";
import { useAuth } from "./AuthContext";

const PresenceContext = createContext(null);

export function PresenceProvider({ children }) {
  const { user } = useAuth();
  const [presence, setPresence] = useState({});
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;

    const unsub = subscribePresence((newPresence) => {
      setPresence(newPresence);
      const online = Object.keys(newPresence).filter(uid => newPresence[uid]?.state === "online");
      setOnlineUsers(online);
    });

    return () => {
      if (unsub) unsub();
    };
  }, [user?.uid]);

  const value = {
    presence,
    onlineUsers,
    isUserOnline: (uid) => {
      const userPresence = presence[uid];
      return userPresence?.state === "online";
    },
    getUserName: (uid) => {
      const userPresence = presence[uid];
      return userPresence?.name || "Student";
    },
  };

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}

export { PresenceContext };