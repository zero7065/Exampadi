import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { getUserProfile } from "../lib/userProfile";

export function useOnboarding() {
  const { user, loading: authLoading } = useAuth();
  const [onboarded, setOnboarded] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkOnboarding = useCallback(async () => {
    if (!user) {
      setOnboarded(false);
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const userProfile = await getUserProfile(user.uid);
      setProfile(userProfile);
      setOnboarded(userProfile?.onboarded === true);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setOnboarded(false);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  /* eslint-disable react-hooks/set-state-in-effect -- sync onboarding state with auth/profile on mount */
  useEffect(() => {
    if (!authLoading) {
      checkOnboarding();
    }
  }, [authLoading, checkOnboarding]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return { onboarded, profile, loading: loading || authLoading, refreshProfile: checkOnboarding };
}