import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { useAuth } from "./useAuth";
import { DEFAULT_NOTIFICATION_PREFS, type Notification, type NotificationPrefs } from "@/lib/types";
import { notificationMeta } from "@/lib/notifications";

const NOTIFICATIONS_POLL_MS = 20_000;

export function usePrefs(): NotificationPrefs {
  const { profile } = useAuth();
  const raw = (profile?.notification_prefs as Partial<NotificationPrefs> | null) ?? {};
  return { ...DEFAULT_NOTIFICATION_PREFS, ...raw, push: { ...DEFAULT_NOTIFICATION_PREFS.push, ...(raw.push ?? {}) } };
}

export function canShowPush(prefs: NotificationPrefs, type: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission !== "granted" || !prefs.push_enabled) return false;
  const category = notificationMeta(type).category;
  return prefs.push?.[category] !== false;
}

/**
 * Mount once (AppShell). Polls the notification list and fires a browser push for
 * rows that appear between two polls.
 */
export function useNotificationRealtime() {
  const { user } = useAuth();
  const prefs = usePrefs();
  const { data: notifications } = useNotifications();
  const seenRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!user) {
      seenRef.current = null;
      return;
    }
    if (!notifications) return;
    // First poll after sign-in only records what already exists — no catch-up popups.
    if (!seenRef.current) {
      seenRef.current = new Set(notifications.map((n) => n.id));
      return;
    }
    const seen = seenRef.current;
    for (const n of [...notifications].reverse()) {
      if (seen.has(n.id)) continue;
      seen.add(n.id);
      if (!canShowPush(prefs, n.type)) continue;
      try {
        const browserNotif = new Notification(n.title, { body: n.body ?? "", tag: n.id, icon: "/favicon.ico" });
        browserNotif.onclick = () => {
          window.focus();
          if (n.link) window.location.assign(n.link);
        };
      } catch {
        /* ignore: some browsers block constructor outside a service worker */
      }
    }
  }, [notifications, prefs, user]);
}

export function useUnreadNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notifications-unread", user?.id],
    enabled: !!user,
    refetchInterval: NOTIFICATIONS_POLL_MS,
    queryFn: async () => {
      const { count, error } = await db.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user!.id).is("read_at", null);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    refetchInterval: NOTIFICATIONS_POLL_MS,
    queryFn: async () => {
      const { data, error } = await db.from("notifications").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });
}

export function useMarkNotificationRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null);
      if (error) throw error;
    },
    onMutate: (id) => {
      const now = new Date().toISOString();
      let wasUnread = false;
      queryClient.setQueryData<Notification[]>(["notifications", user?.id], (old = []) =>
        old.map((n) => {
          if (n.id !== id || n.read_at) return n;
          wasUnread = true;
          return { ...n, read_at: now };
        }),
      );
      if (wasUnread) queryClient.setQueryData<number>(["notifications-unread", user?.id], (old = 0) => Math.max(0, old - 1));
    },
  });
}

export function useMarkAllNotificationsRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await db.rpc("mark_all_notifications_read");
      if (error) throw error;
    },
    onSuccess: () => {
      const now = new Date().toISOString();
      queryClient.setQueryData<Notification[]>(["notifications", user?.id], (old = []) => old.map((n) => (n.read_at ? n : { ...n, read_at: now })));
      queryClient.setQueryData<number>(["notifications-unread", user?.id], 0);
    },
  });
}
