import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Order, OrderWithDetails, ProfileLite } from "@/lib/types";

async function hydrateOrders(orders: Order[]): Promise<OrderWithDetails[]> {
  if (!orders.length) return [];
  const adIds = [...new Set(orders.map((o) => o.ad_id))];
  const userIds = [...new Set(orders.flatMap((o) => [o.buyer_id, o.seller_id]))];
  const [{ data: ads }, { data: profiles }] = await Promise.all([
    supabase.from("ads").select("id, title, images, currency").in("id", adIds),
    supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", userIds),
  ]);
  const adMap = new Map((ads ?? []).map((a) => [a.id, a]));
  const pMap = new Map((profiles ?? []).map((p) => [p.id, p as ProfileLite]));
  const fallback = (id: string): ProfileLite => ({ id, username: "unknown", display_name: "Unknown user", avatar_url: null });
  return orders.map((o) => ({
    ...o,
    ad: adMap.get(o.ad_id) ?? { id: o.ad_id, title: "Deleted ad", images: [], currency: "NGN" },
    buyer: pMap.get(o.buyer_id) ?? fallback(o.buyer_id),
    seller: pMap.get(o.seller_id) ?? fallback(o.seller_id),
  }));
}

export function useOrders(side: "buying" | "selling") {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["orders", user?.id, side],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq(side === "buying" ? "buyer_id" : "seller_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return hydrateOrders(data);
    },
  });
}

export function useAllOrders() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["orders", user?.id, "all"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .or(`buyer_id.eq.${user!.id},seller_id.eq.${user!.id}`)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return hydrateOrders(data);
    },
  });
}

export function useRecentOrders(limit = 5) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dashboard", "recent-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .or(`buyer_id.eq.${user!.id},seller_id.eq.${user!.id}`)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return hydrateOrders(data);
    },
  });
}

export function usePlaceOrder() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ adId, sellerId, quantity, unitPrice, notes }: { adId: string; sellerId: string; quantity: number; unitPrice: number; notes?: string }) => {
      if (!user) throw new Error("Sign in to place an order");
      const { data, error } = await supabase
        .from("orders")
        .insert({ ad_id: adId, seller_id: sellerId, buyer_id: user.id, quantity, total_price: unitPrice * quantity, notes: notes || null })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Order["status"] }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

const ONGOING_STATUSES = ["pending", "accepted", "paid", "shipped", "in_progress", "disputed"];

export function useOngoingOrdersCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["orders", "ongoing-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .or(`buyer_id.eq.${user!.id},seller_id.eq.${user!.id}`)
        .in("status", ONGOING_STATUSES);
      if (error) throw error;
      return count ?? 0;
    },
  });
}
