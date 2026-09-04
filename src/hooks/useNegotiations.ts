import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Negotiation } from "@/lib/types";

export function isOpenOffer(n: Negotiation) {
  return (n.status === "pending" || n.status === "countered") && new Date(n.expires_at).getTime() > Date.now();
}

/** Live view of every negotiation between the current user and the other participant of a conversation. */
export function useConversationNegotiations(conversationId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!conversationId || !user) return;
    const channel = supabase
      .channel(`negotiations-${conversationId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "negotiations", filter: `conversation_id=eq.${conversationId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["negotiations", "conversation", conversationId] });
        queryClient.invalidateQueries({ queryKey: ["negotiations", "ad"] });
        queryClient.invalidateQueries({ queryKey: ["orders"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user, queryClient]);

  return useQuery({
    queryKey: ["negotiations", "conversation", conversationId],
    enabled: !!conversationId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("negotiations")
        .select("*, ad:ads!negotiations_ad_id_fkey(id, title, currency, price)")
        .eq("conversation_id", conversationId!)
        .order("updated_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as (Negotiation & { ad: { id: string; title: string; currency: string; price: number } | null })[];
    },
  });
}

/** The current user's own offer on a given ad (buyer side). */
export function useMyOfferOnAd(adId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["negotiations", "ad", adId, user?.id],
    enabled: !!adId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("negotiations")
        .select("*")
        .eq("ad_id", adId!)
        .eq("buyer_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useMakeOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ adId, price, message }: { adId: string; price: number; message?: string | undefined }) => {
      const { data, error } = await supabase.rpc("make_offer", { p_ad: adId, p_price: price, ...(message ? { p_message: message } : {}) });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["negotiations"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useRespondToOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, price, message }: { id: string; action: "accept" | "decline" | "counter"; price?: number | undefined; message?: string | undefined }) => {
      const { error } = await supabase.rpc("respond_to_offer", {
        p_negotiation: id,
        p_action: action,
        ...(price !== undefined ? { p_price: price } : {}),
        ...(message ? { p_message: message } : {}),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["negotiations"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
