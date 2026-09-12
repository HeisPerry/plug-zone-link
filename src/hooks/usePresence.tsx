import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { useAuth } from "./useAuth";

/** A user counts as online when their heartbeat landed within this window. */
const ONLINE_WINDOW_MS = 90_000;
const HEARTBEAT_MS = 60_000;
const PRESENCE_POLL_MS = 30_000;

// Kept so existing consumers of the provider keep compiling; presence is now polled per user.
const PresenceContext = createContext<boolean>(false);

/** Keeps the signed-in user's last_seen_at fresh. Other users' presence is polled on demand. */
export function PresenceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const touch = () => {
      if (document.visibilityState === "visible") void db.rpc("touch_last_seen");
    };
    touch();
    const interval = setInterval(touch, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", touch);
    window.addEventListener("pagehide", touch);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", touch);
      window.removeEventListener("pagehide", touch);
      void db.rpc("touch_last_seen");
    };
  }, [user]);

  return <PresenceContext.Provider value={!!user}>{children}</PresenceContext.Provider>;
}

type PresenceRow = { last_seen_at: string | null; show_last_seen: boolean };

/** One polled read per user, shared by the online dot and the last-seen label. */
function usePresenceRow(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["presence", userId],
    enabled: !!userId,
    staleTime: PRESENCE_POLL_MS,
    refetchInterval: PRESENCE_POLL_MS,
    queryFn: async (): Promise<PresenceRow | null> => {
      const { data, error } = await db.from("profiles").select("last_seen_at, show_last_seen").eq("id", userId!).maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
}

export function useIsOnline(userId: string | null | undefined) {
  const { user } = useAuth();
  const { data } = usePresenceRow(userId);
  // I'm always "online" to myself; nobody is shown as online when they've hidden last seen.
  if (userId && user?.id === userId) return true;
  if (!data?.show_last_seen || !data.last_seen_at) return false;
  return Date.now() - new Date(data.last_seen_at).getTime() < ONLINE_WINDOW_MS;
}

/** Last-seen time for a user, or null when they've hidden it. */
export function useLastSeen(userId: string | null | undefined, online: boolean) {
  const query = usePresenceRow(online ? userId : userId);
  return useMemo(
    () => ({ ...query, data: query.data?.show_last_seen ? (query.data.last_seen_at ?? null) : null }),
    [query],
  );
}

/**
 * Typing indicator. Live broadcast is not available while the app runs on polling,
 * so this reports nothing and accepts local keystrokes without sending them.
 */
export function useTyping(_conversationId: string | null) {
  const [othersTyping] = useState(false);
  const sendTyping = useCallback((_typing = true) => {}, []);
  return useMemo(() => ({ othersTyping, sendTyping }), [othersTyping, sendTyping]);
}

export function usePresenceActive() {
  return useContext(PresenceContext);
}
