import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/lib/types";
import { answerSessionPings, clearSessionMode, shouldDropStoredSession } from "@/lib/session-mode";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    setProfile(data ?? null);
  }, []);

  useEffect(() => {
    let mounted = true;
    const stopAnswering = answerSessionPings();
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (!mounted) return;
      setSession(s);
      if (event === "SIGNED_OUT") {
        setProfile(null);
        queryClient.clear();
      } else if (s?.user) {
        // defer to avoid deadlocks inside the auth callback
        setTimeout(() => loadProfile(s.user.id), 0);
      }
    });
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      let current = data.session;
      // "Remember me" was off and this is a fresh browser launch: drop the stored session.
      if (current && (await shouldDropStoredSession())) {
        clearSessionMode();
        await supabase.auth.signOut();
        current = null;
        // Full reload so no in-memory state from the dropped session survives.
        if (window.location.pathname !== "/login") window.location.replace("/login");
      }
      if (!mounted) return;
      setSession(current);
      await loadProfile(current?.user.id);
      setLoading(false);
    });
    return () => {
      mounted = false;
      stopAnswering();
      sub.subscription.unsubscribe();
    };
  }, [loadProfile, queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      profile,
      loading,
      refreshProfile: () => loadProfile(session?.user.id),
      signOut: async () => {
        await queryClient.cancelQueries();
        queryClient.clear();
        clearSessionMode();
        await supabase.auth.signOut();
      },
    }),
    [session, profile, loading, loadProfile, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
