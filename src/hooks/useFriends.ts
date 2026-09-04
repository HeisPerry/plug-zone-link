import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { FriendRequest, ProfileLite } from "@/lib/types";

export type Relationship =
  | { kind: "none" }
  | { kind: "friends"; friendshipId: string }
  | { kind: "outgoing"; requestId: string }
  | { kind: "incoming"; requestId: string };

export interface FriendGraph {
  friends: { friendshipId: string; profile: ProfileLite }[];
  incoming: { request: FriendRequest; profile: ProfileLite }[];
  outgoing: { request: FriendRequest; profile: ProfileLite }[];
  relationshipWith: (userId: string) => Relationship;
}

export function useFriendGraph() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["friends", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<FriendGraph> => {
      const me = user!.id;
      const [{ data: friendships, error: e1 }, { data: requests, error: e2 }] = await Promise.all([
        supabase.from("friendships").select("*").or(`user_one.eq.${me},user_two.eq.${me}`),
        supabase.from("friend_requests").select("*").eq("status", "pending").or(`sender_id.eq.${me},receiver_id.eq.${me}`),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const ids = new Set<string>();
      friendships?.forEach((f) => ids.add(f.user_one === me ? f.user_two : f.user_one));
      requests?.forEach((r) => ids.add(r.sender_id === me ? r.receiver_id : r.sender_id));
      const { data: profiles } = ids.size
        ? await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", [...ids])
        : { data: [] as ProfileLite[] };
      const pMap = new Map((profiles ?? []).map((p) => [p.id, p as ProfileLite]));
      const get = (id: string): ProfileLite => pMap.get(id) ?? { id, username: "unknown", display_name: "Unknown user", avatar_url: null };

      const friends = (friendships ?? []).map((f) => ({ friendshipId: f.id, profile: get(f.user_one === me ? f.user_two : f.user_one) }));
      const incoming = (requests ?? []).filter((r) => r.receiver_id === me).map((r) => ({ request: r, profile: get(r.sender_id) }));
      const outgoing = (requests ?? []).filter((r) => r.sender_id === me).map((r) => ({ request: r, profile: get(r.receiver_id) }));

      const relationshipWith = (userId: string): Relationship => {
        const f = friends.find((x) => x.profile.id === userId);
        if (f) return { kind: "friends", friendshipId: f.friendshipId };
        const inc = incoming.find((x) => x.profile.id === userId);
        if (inc) return { kind: "incoming", requestId: inc.request.id };
        const out = outgoing.find((x) => x.profile.id === userId);
        if (out) return { kind: "outgoing", requestId: out.request.id };
        return { kind: "none" };
      };
      return { friends, incoming, outgoing, relationshipWith };
    },
  });
}

export function useSearchPeople(term: string) {
  const { user } = useAuth();
  const q = term.trim().toLowerCase();
  return useQuery({
    queryKey: ["people-search", q],
    enabled: q.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .ilike("username", `%${q}%`)
        .neq("id", user?.id ?? "00000000-0000-0000-0000-000000000000")
        .limit(20);
      if (error) throw error;
      return data as ProfileLite[];
    },
  });
}

export function useFriendActions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["friends", user?.id] });

  const send = useMutation({
    mutationFn: async (receiverId: string) => {
      const { error } = await supabase.from("friend_requests").insert({ sender_id: user!.id, receiver_id: receiverId });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const accept = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc("accept_friend_request", { p_request: requestId });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const decline = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.from("friend_requests").update({ status: "rejected" }).eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const cancel = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.from("friend_requests").delete().eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  return { send, accept, decline, cancel, remove };
}
