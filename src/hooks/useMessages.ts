import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { ConversationWithOther, Message, ProfileLite } from "@/lib/types";

export function useUnreadCount() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;
    // Anything addressed to me that arrived while I was away is now "delivered".
    void supabase.rpc("mark_messages_delivered");
    // Unique per hook instance: several components (Sidebar, MobileNav) mount this hook at once,
    // and supabase.channel() returns an existing subscribed channel for a duplicate name.
    const channel = supabase
      .channel(`unread-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` }, (payload) => {
        if (payload.eventType === "INSERT") {
          const msg = payload.new as Message;
          if (!msg.delivered_at) void supabase.from("messages").update({ delivered_at: new Date().toISOString() }).eq("id", msg.id).is("delivered_at", null);
        }
        queryClient.invalidateQueries({ queryKey: ["unread", user.id] });
        queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return useQuery({
    queryKey: ["unread", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", user!.id)
        .eq("read", false);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useConversations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["conversations", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ConversationWithOther[]> => {
      const { data: convos, error } = await supabase
        .from("conversations")
        .select("*")
        .or(`participant_one.eq.${user!.id},participant_two.eq.${user!.id}`)
        .order("last_message_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      if (!convos.length) return [];

      const otherIds = convos.map((c) => (c.participant_one === user!.id ? c.participant_two : c.participant_one));
      const convoIds = convos.map((c) => c.id);
      const [{ data: profiles }, { data: msgs }] = await Promise.all([
        supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", otherIds),
        supabase
          .from("messages")
          .select("conversation_id, content, created_at, sender_id, read, receiver_id")
          .in("conversation_id", convoIds)
          .order("created_at", { ascending: false })
          .limit(500),
      ]);
      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p as ProfileLite]));
      const lastMap = new Map<string, { content: string; created_at: string; sender_id: string }>();
      const unreadMap = new Map<string, number>();
      for (const m of msgs ?? []) {
        if (!lastMap.has(m.conversation_id)) lastMap.set(m.conversation_id, m);
        if (!m.read && m.receiver_id === user!.id) unreadMap.set(m.conversation_id, (unreadMap.get(m.conversation_id) ?? 0) + 1);
      }
      return convos.map((c) => {
        const otherId = c.participant_one === user!.id ? c.participant_two : c.participant_one;
        return {
          ...c,
          other: profileMap.get(otherId) ?? { id: otherId, username: "unknown", display_name: "Unknown user", avatar_url: null },
          lastMessage: lastMap.get(c.id) ?? null,
          unread: unreadMap.get(c.id) ?? 0,
        };
      });
    },
  });
}

export function useThread(conversationId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!conversationId || !user) return;
    const channel = supabase
      .channel(`thread-${conversationId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const msg = payload.new as Message;
          queryClient.setQueryData<Message[]>(["thread", conversationId], (old = []) =>
            old.some((m) => m.id === msg.id) ? old : [...old, msg],
          );
          if (msg.receiver_id === user.id) {
            supabase.from("messages").update({ read: true }).eq("id", msg.id).then(() => {
              queryClient.invalidateQueries({ queryKey: ["unread", user.id] });
            });
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user, queryClient]);

  return useQuery({
    queryKey: ["thread", conversationId],
    enabled: !!conversationId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      // mark unread as read
      const unreadIds = data.filter((m) => m.receiver_id === user!.id && !m.read).map((m) => m.id);
      if (unreadIds.length) {
        await supabase.from("messages").update({ read: true }).in("id", unreadIds);
        queryClient.invalidateQueries({ queryKey: ["unread", user!.id] });
        queryClient.invalidateQueries({ queryKey: ["conversations", user!.id] });
      }
      return data;
    },
  });
}

export function useSendMessage(conversationId: string | null, receiverId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) => {
      if (!conversationId || !receiverId || !user) throw new Error("No conversation selected");
      const { data, error } = await supabase
        .from("messages")
        .insert({ conversation_id: conversationId, sender_id: user.id, receiver_id: receiverId, content })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (msg) => {
      queryClient.setQueryData<Message[]>(["thread", conversationId], (old = []) =>
        old.some((m) => m.id === msg.id) ? old : [...old, msg],
      );
      queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] });
    },
  });
}

export function useStartConversation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (otherUserId: string) => {
      const { data, error } = await supabase.rpc("get_or_create_conversation", { p_other: otherUserId });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] }),
  });
}
