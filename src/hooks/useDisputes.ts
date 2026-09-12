import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { useAuth } from "./useAuth";
import type { Database } from "@/integrations/supabase/types";
import type { ProfileLite } from "@/lib/types";

export type Dispute = Database["public"]["Tables"]["disputes"]["Row"];
export type DisputeMessage = Database["public"]["Tables"]["dispute_messages"]["Row"];

export interface DisputeWithOrder extends Dispute {
  order_number: string | null;
  ad_title: string;
  total_price: number;
  currency: string;
  buyer: ProfileLite;
  seller: ProfileLite;
}

const fallback = (id: string): ProfileLite => ({ id, username: "unknown", display_name: "Unknown user", avatar_url: null });

async function hydrate(rows: Dispute[]): Promise<DisputeWithOrder[]> {
  if (!rows.length) return [];
  const orderIds = [...new Set(rows.map((d) => d.order_id))];
  const userIds = [...new Set(rows.flatMap((d) => [d.buyer_id, d.seller_id]))];
  const [{ data: orders }, { data: profiles }] = await Promise.all([
    db.from("orders").select("id, order_number, total_price, ad_id").in("id", orderIds),
    db.from("profiles").select("id, username, display_name, avatar_url").in("id", userIds),
  ]);
  const adIds = [...new Set((orders ?? []).map((o) => o.ad_id))];
  const { data: ads } = adIds.length ? await db.from("ads").select("id, title, currency").in("id", adIds) : { data: [] as { id: string; title: string; currency: string }[] };
  const adMap = new Map((ads ?? []).map((a) => [a.id, a]));
  const orderMap = new Map((orders ?? []).map((o) => [o.id, o]));
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p as ProfileLite]));
  return rows.map((d) => {
    const order = orderMap.get(d.order_id);
    const ad = order ? adMap.get(order.ad_id) : undefined;
    return {
      ...d,
      order_number: order?.order_number ?? null,
      ad_title: ad?.title ?? "Deleted listing",
      total_price: Number(order?.total_price ?? 0),
      currency: ad?.currency ?? "NGN",
      buyer: profileMap.get(d.buyer_id) ?? fallback(d.buyer_id),
      seller: profileMap.get(d.seller_id) ?? fallback(d.seller_id),
    };
  });
}

/** Reports the signed-in member is part of (admins see every report through RLS). */
export function useMyDisputes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["disputes", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<DisputeWithOrder[]> => {
      const { data, error } = await db.from("disputes").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return hydrate(data ?? []);
    },
    staleTime: 20_000,
  });
}

export function useDispute(disputeId: string | undefined) {
  return useQuery({
    queryKey: ["dispute-detail", disputeId],
    enabled: !!disputeId,
    queryFn: async (): Promise<DisputeWithOrder | null> => {
      const { data, error } = await db.from("disputes").select("*").eq("id", disputeId!).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return (await hydrate([data]))[0] ?? null;
    },
  });
}

export function useDisputeMessages(disputeId: string | undefined) {
  return useQuery({
    queryKey: ["dispute-messages", disputeId],
    enabled: !!disputeId,
    queryFn: async (): Promise<DisputeMessage[]> => {
      const { data, error } = await db.from("dispute_messages").select("*").eq("dispute_id", disputeId!).order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 20_000,
  });
}

export function useSendDisputeMessage(disputeId: string | undefined) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (body: string) => {
      const { error } = await db.from("dispute_messages").insert({ dispute_id: disputeId!, author_id: user!.id, body });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dispute-messages", disputeId] }),
  });
}
