import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { useAuth } from "./useAuth";
import { uploadToStorage } from "@/lib/uploads";
import type { ConversationWithOther, Message, ProfileLite } from "@/lib/types";

/** Polling intervals that replace the previous live subscriptions. */
const UNREAD_POLL_MS = 15_000;
const CONVERSATIONS_POLL_MS = 15_000;
const THREAD_POLL_MS = 5_000;

export function useUnreadCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["unread", user?.id],
    enabled: !!user,
    refetchInterval: UNREAD_POLL_MS,
    queryFn: async () => {
      // Anything addressed to me that arrived while I was away is now "delivered".
      void db.rpc("mark_messages_delivered");
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
    refetchInterval: CONVERSATIONS_POLL_MS,
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
        db.from("profiles").select("id, username, display_name, avatar_url").in("id", otherIds),
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

  return useQuery({
    queryKey: ["thread", conversationId],
    enabled: !!conversationId && !!user,
    // Open threads refetch frequently; this replaces the previous live subscription.
    refetchInterval: THREAD_POLL_MS,
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
        await db.from("messages").update({ read: true }).in("id", unreadIds);
        queryClient.invalidateQueries({ queryKey: ["unread", user!.id] });
        queryClient.invalidateQueries({ queryKey: ["conversations", user!.id] });
      }
      return data;
    },
  });
}

/** Looks up a single conversation directly — used when it was just created and isn't in the cached list yet. */
export function useConversation(conversationId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["conversation", conversationId],
    enabled: !!conversationId && !!user,
    queryFn: async (): Promise<ConversationWithOther | null> => {
      const { data: c, error } = await db.from("conversations").select("*").eq("id", conversationId!).maybeSingle();
      if (error) throw error;
      if (!c) return null;
      const otherId = c.participant_one === user!.id ? c.participant_two : c.participant_one;
      const { data: p } = await db.from("profiles").select("id, username, display_name, avatar_url").eq("id", otherId).maybeSingle();
      return { ...c, other: (p as ProfileLite | null) ?? { id: otherId, username: "unknown", display_name: "Unknown user", avatar_url: null }, lastMessage: null, unread: 0 };
    },
  });
}

export const MESSAGE_FILES_BUCKET = "message-files";
export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

export type OutgoingMessage = { content: string; file?: File | null };

export function useSendMessage(conversationId: string | null, receiverId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ content, file }: OutgoingMessage) => {
      if (!conversationId || !receiverId || !user) throw new Error("No conversation selected");
      const text = content.trim();
      if (!text && !file) throw new Error("Write a message or attach a file");

      let attachment: Partial<Pick<Message, "attachment_url" | "attachment_name" | "attachment_type" | "attachment_size">> = {};
      if (file) {
        if (file.size > MAX_ATTACHMENT_BYTES) throw new Error("Files must be 20 MB or smaller");
        const url = await uploadToStorage(file, "messages");
        attachment = { attachment_url: url, attachment_name: file.name, attachment_type: file.type || "application/octet-stream", attachment_size: file.size };
      }

      const { data, error } = await supabase
        .from("messages")
        .insert({ conversation_id: conversationId, sender_id: user.id, receiver_id: receiverId, content: text || (file ? `Sent a file: ${file.name}` : ""), ...attachment })
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
      const { data, error } = await db.rpc("get_or_create_conversation", { p_other: otherUserId });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] }),
  });
}
