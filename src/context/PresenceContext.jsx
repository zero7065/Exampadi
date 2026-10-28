import { createContext, useEffect, useMemo, useState } from "react";
import { subscribePresenceForUids, trackPresence } from "../lib/presence";
import { useAuth } from "./AuthContext";

const PresenceContext = createContext(null);

export function PresenceProvider({ children }) {
  const { user } = useAuth();
  const [presence, setPresence] = useState({});

  useEffect(() => {
    if (!user?.uid) return undefined;

    const stopTracking = trackPresence(user.uid, {
      name: user.displayName || "Student",
    });
    const unsubscribe = subscribePresenceForUids([user.uid], setPresence);
    return () => {
      unsubscribe();
      stopTracking();
    };
  }, [user?.uid, user?.displayName]);

  const value = useMemo(() => ({
    presence,
    isUserOnline: (uid) => Boolean(presence[uid]?.state === "online"),
    getUserName: (uid) => presence[uid]?.name || "Student",
  }), [presence]);

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}

export { PresenceContext };
