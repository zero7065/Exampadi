// ManagementRoute — only role === "management" may enter.
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserProfile } from "../lib/userProfile";
import { isManagementRole } from "../lib/roles";
import { isAdmin } from "../lib/activityLog";

export default function ManagementRoute({ children }) {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState(undefined);

  useEffect(() => {
    if (!user) return;
    let live = true;
    getUserProfile(user.uid)
      .then((p) => { if (live) setProfile(p || null); })
      .catch(() => { if (live) setProfile(null); });
    return () => { live = false; };
  }, [user]);

  const checking = loading || (!!user && profile === undefined);

  if (checking) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <div style={{ width: 40, height: 40, border: "3px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  // Admins may preview any school's management view (via ?school=<id>).
  if (!isManagementRole(profile) && !isAdmin(user)) return <Navigate to="/dashboard" replace />;

  return children;
}