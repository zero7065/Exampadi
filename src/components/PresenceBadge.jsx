// src/components/PresenceBadge.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { isOnline } from "../lib/presence";

export default function PresenceBadge({ presence, userId }) {
  const [status, setStatus] = useState("offline");

  useEffect(() => {
    if (!userId) return;

    const updateStatus = () => {
      const online = isOnline(presence[userId]);
      setStatus(online ? "online" : "offline");
    };

    updateStatus();
    const interval = setInterval(updateStatus, 1000);

    return () => clearInterval(interval);
  }, [presence, userId]);

  return (
    <div className={`w-3 h-3 rounded-full ${status === "online" ? "bg-green-500" : "bg-gray-500"} ${status === "online" ? "animate-pulse" : ""}`} title={`${userId} is ${status}`} />
  );
}