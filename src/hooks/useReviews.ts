import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { ProfileLite } from "@/lib/types";

export type ReviewWithReviewer = {
  id: string;
  order_id: string;
  ad_id: string | null;
  reviewer_id: string;
  seller_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer: ProfileLite;
};

export function useSellerReviews(sellerId?: string | null) {
  return useQuery({
    queryKey: ["reviews", sellerId],
    enabled: !!sellerId,
    queryFn: async (): Promise<ReviewWithReviewer[]> => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, order_id, ad_id, reviewer_id, seller_id, rating, comment, created_at")
        .eq("seller_id", sellerId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const rows = data ?? [];
      if (!rows.length) return [];
      const ids = [...new Set(rows.map((r) => r.reviewer_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", ids);
      const map = new Map((profiles ?? []).map((p) => [p.id, p as ProfileLite]));
      return rows.map((r) => ({
        ...r,
        reviewer: map.get(r.reviewer_id) ?? { id: r.reviewer_id, username: "unknown", display_name: "PlugZone user", avatar_url: null },
      }));
    },
  });
}

/** Completed orders the signed-in buyer placed with this seller that still have no review. */
export function useReviewableOrders(sellerId?: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["reviewable-orders", user?.id, sellerId],
    enabled: !!user && !!sellerId && user.id !== sellerId,
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("id, ad_id, created_at, total_price")
        .eq("buyer_id", user!.id)
        .eq("seller_id", sellerId!)
        .eq("status", "completed")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const list = orders ?? [];
      if (!list.length) return [];
      const { data: mine } = await supabase
        .from("reviews")
        .select("order_id")
        .eq("reviewer_id", user!.id)
        .in("order_id", list.map((o) => o.id));
      const reviewed = new Set((mine ?? []).map((r) => r.order_id));
      return list.filter((o) => !reviewed.has(o.id));
    },
  });
}

export function useSubmitReview() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { orderId: string; adId: string | null; sellerId: string; rating: number; comment: string }) => {
      const { error } = await supabase.from("reviews").insert({
        order_id: input.orderId,
        ad_id: input.adId,
        reviewer_id: user!.id,
        seller_id: input.sellerId,
        rating: input.rating,
        comment: input.comment.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["reviews", v.sellerId] });
      qc.invalidateQueries({ queryKey: ["reviewable-orders"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
