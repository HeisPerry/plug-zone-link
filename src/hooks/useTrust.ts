import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SellerTrust {
  score: number;
  tier: string;
  salesPoints: number;
  ratingPoints: number;
  completionPoints: number;
  disputePoints: number;
  maxSales: number;
  maxRating: number;
  maxCompletion: number;
  maxDisputes: number;
  completedOrders: number;
  totalOrders: number;
  avgRating: number;
  reviewCount: number;
  disputes: number;
}

export function useSellerTrust(sellerId?: string | null) {
  return useQuery({
    queryKey: ["seller-trust", sellerId],
    enabled: !!sellerId,
    staleTime: 60_000,
    queryFn: async (): Promise<SellerTrust | null> => {
      const { data, error } = await supabase.rpc("get_seller_trust", { p_user: sellerId! });
      if (error) throw error;
      const row = (data ?? [])[0];
      if (!row) return null;
      return {
        score: Number(row.score ?? 0),
        tier: String(row.tier ?? "New"),
        salesPoints: Number(row.sales_points ?? 0),
        ratingPoints: Number(row.rating_points ?? 0),
        completionPoints: Number(row.completion_points ?? 0),
        disputePoints: Number(row.dispute_points ?? 0),
        maxSales: Number(row.max_sales ?? 0),
        maxRating: Number(row.max_rating ?? 0),
        maxCompletion: Number(row.max_completion ?? 0),
        maxDisputes: Number(row.max_disputes ?? 0),
        completedOrders: Number(row.completed_orders ?? 0),
        totalOrders: Number(row.total_orders ?? 0),
        avgRating: Number(row.avg_rating ?? 0),
        reviewCount: Number(row.review_count ?? 0),
        disputes: Number(row.disputes ?? 0),
      };
    },
  });
}
