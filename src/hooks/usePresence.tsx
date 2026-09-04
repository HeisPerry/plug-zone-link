import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

const PresenceContext = createContext<Set<string>>(new Set());

/** Tracks who is online via Realtime Presence and keeps the signed-in user's last_seen_at fresh. */
export function PresenceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [online, setOnline] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setOnline(new Set());
      return;
    }
    const channel = supabase.channel("online-users", { config: { presence: { key: user.id } } });
    const sync = () => setOnline(new Set(Object.keys(channel.presenceState())));
    channel
      .on("presence", { event: "sync" }, sync)
      .on("presence", { event: "join" }, sync)
      .on("presence", { event: "leave" }, sync)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel.track({ user_id: user.id, at: new Date().toISOString() });
      });

    const touch = () => {
      if (document.visibilityState === "visible") void supabase.rpc("touch_last_seen");
    };
    touch();
    const interval = setInterval(touch, 60_000);
    document.addEventListener("visibilitychange", touch);
    window.addEventListener("pagehide", touch);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", touch);
      window.removeEventListener("pagehide", touch);
      void supabase.rpc("touch_last_seen");
      supabase.removeChannel(channel);
    };
  }, [user]);

  return <PresenceContext.Provider value={online}>{children}</PresenceContext.Provider>;
}

export function useIsOnline(userId: string | null | undefined) {
  const online = useContext(PresenceContext);
  return !!userId && online.has(userId);
}

/** Last-seen time for a user, or null when they've hidden it. Skipped while they're online. */
export function useLastSeen(userId: string | null | undefined, online: boolean) {
  return useQuery({
    queryKey: ["last-seen", userId],
    enabled: !!userId && !online,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("last_seen_at, show_last_seen").eq("id", userId!).maybeSingle();
      if (error) throw error;
      return data?.show_last_seen ? (data.last_seen_at ?? null) : null;
    },
  });
}

/** Typing indicator for one conversation using Realtime broadcast (never stored). */
export function useTyping(conversationId: string | null) {
  const { user } = useAuth();
  const [othersTyping, setOthersTyping] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastSentRef = useRef(0);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!conversationId || !user) return;
    const channel = supabase.channel(`typing-${conversationId}`, { config: { broadcast: { self: false } } });
    channel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload?.user_id === user.id) return;
        setOthersTyping(payload?.typing !== false);
        if (clearTimer.current) clearTimeout(clearTimer.current);
        if (payload?.typing !== false) clearTimer.current = setTimeout(() => setOthersTyping(false), 3000);
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      if (clearTimer.current) clearTimeout(clearTimer.current);
      channelRef.current = null;
      setOthersTyping(false);
      supabase.removeChannel(channel);
    };
  }, [conversationId, user]);

  const sendTyping = useCallback(
    (typing = true) => {
      if (!channelRef.current || !user) return;
      const now = Date.now();
      if (typing && now - lastSentRef.current < 1500) return;
      lastSentRef.current = typing ? now : 0;
      void channelRef.current.send({ type: "broadcast", event: "typing", payload: { user_id: user.id, typing } });
    },
    [user],
  );

  return useMemo(() => ({ othersTyping, sendTyping }), [othersTyping, sendTyping]);
}
