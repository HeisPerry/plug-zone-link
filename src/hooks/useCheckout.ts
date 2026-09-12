import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { useAuth } from "./useAuth";
import type { OrderWithDetails, ProfileLite } from "@/lib/types";
import type { Database } from "@/integrations/supabase/types";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
export type OrderEvent = Database["public"]["Tables"]["order_events"]["Row"];
export type Dispute = Database["public"]["Tables"]["disputes"]["Row"];

export type CheckoutInput = {
  adId: string;
  quantity: number;
  deliveryMethod: string;
  deliveryAddress: string;
  buyerName: string;
  buyerPhone: string;
  notes: string;
  couponCode?: string;
};

/** Creates the order (unpaid). Returns the new order id. */
export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CheckoutInput) => {
      const { data, error } = await db.rpc("place_order", {
        p_ad: input.adId,
        p_quantity: input.quantity,
        p_delivery_method: input.deliveryMethod,
        p_delivery_address: input.deliveryAddress,
        p_buyer_name: input.buyerName,
        p_buyer_phone: input.buyerPhone,
        p_notes: input.notes,
        p_coupon_code: input.couponCode ?? "",
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

/** Sandbox payment: marks the order paid and holds the money in escrow. No real money moves. */
export function usePayForOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await db.rpc("pay_order_test_mode", { p_order: orderId });
      if (error) throw error;
    },
    onSuccess: (_d, orderId) => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order", orderId] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["seller-earnings"] });
    },
  });
}

export function useOrder(orderId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["order", orderId],
    enabled: !!orderId && !!user,
    queryFn: async (): Promise<OrderWithDetails | null> => {
      const { data, error } = await db.from("orders").select("*").eq("id", orderId!).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const o = data as OrderRow;
      const [{ data: ad }, { data: profiles }] = await Promise.all([
        db.from("ads").select("id, title, images, currency").eq("id", o.ad_id).maybeSingle(),
        db.from("profiles").select("id, username, display_name, avatar_url").in("id", [o.buyer_id, o.seller_id]),
      ]);
      const map = new Map((profiles ?? []).map((p) => [p.id, p as ProfileLite]));
      const fallback = (id: string): ProfileLite => ({ id, username: "unknown", display_name: "Unknown user", avatar_url: null });
      return {
        ...o,
        ad: ad ?? { id: o.ad_id, title: "Deleted listing", images: [], currency: "NGN" },
        buyer: map.get(o.buyer_id) ?? fallback(o.buyer_id),
        seller: map.get(o.seller_id) ?? fallback(o.seller_id),
      } as OrderWithDetails;
    },
  });
}

export function useOrderEvents(orderId: string | undefined) {
  return useQuery({
    queryKey: ["order-events", orderId],
    enabled: !!orderId,
    queryFn: async (): Promise<OrderEvent[]> => {
      const { data, error } = await db.from("order_events").select("*").eq("order_id", orderId!).order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useOrderDispute(orderId: string | undefined) {
  return useQuery({
    queryKey: ["dispute", orderId],
    enabled: !!orderId,
    queryFn: async (): Promise<Dispute | null> => {
      const { data, error } = await db.from("disputes").select("*").eq("order_id", orderId!).maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
}

function useOrderAction<TVars>(fn: (vars: TVars) => Promise<void>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order"] });
      qc.invalidateQueries({ queryKey: ["order-events"] });
      qc.invalidateQueries({ queryKey: ["escrow-ledger"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["dispute"] });
      qc.invalidateQueries({ queryKey: ["seller-earnings"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

export function useSetFulfilment() {
  return useOrderAction(async ({ orderId, stage, note }: { orderId: string; stage: "shipped" | "delivered"; note?: string }) => {
    const { error } = await db.rpc("set_order_fulfilment", { p_order: orderId, p_stage: stage, p_note: note ?? "" });
    if (error) throw error;
  });
}

export function useConfirmReceipt() {
  return useOrderAction(async (orderId: string) => {
    const { error } = await db.rpc("confirm_receipt", { p_order: orderId });
    if (error) throw error;
  });
}

export function useOpenDispute() {
  return useOrderAction(async ({ orderId, reason, description }: { orderId: string; reason: string; description: string }) => {
    const { error } = await db.rpc("open_dispute", { p_order: orderId, p_reason: reason, p_description: description });
    if (error) throw error;
  });
}

export function useAcceptOrder() {
  return useOrderAction(async (orderId: string) => {
    const { error } = await db.rpc("seller_accept_order", { p_order: orderId });
    if (error) throw error;
  });
}

export function useCancelOrder() {
  return useOrderAction(async ({ orderId, reason }: { orderId: string; reason?: string | undefined }) => {
    const { error } = await db.rpc("cancel_order", { p_order: orderId, p_reason: reason ?? "" });
    if (error) throw error;
  });
}

export function useRequestRefund() {
  return useOrderAction(async ({ orderId, reason, amount }: { orderId: string; reason: string; amount?: number | undefined }) => {
    const { error } = await db.rpc("request_refund", { p_order: orderId, p_reason: reason, ...(amount ? { p_amount: amount } : {}) });
    if (error) throw error;
  });
}

export function useWithdrawRefundRequest() {
  return useOrderAction(async (orderId: string) => {
    const { error } = await db.rpc("withdraw_refund_request", { p_order: orderId });
    if (error) throw error;
  });
}

export function useRespondRefund() {
  return useOrderAction(async ({ orderId, action, amount, note }: { orderId: string; action: "approve" | "decline"; amount?: number | undefined; note?: string | undefined }) => {
    const { error } = await db.rpc("respond_refund_request", { p_order: orderId, p_action: action, ...(amount ? { p_amount: amount } : {}), p_note: note ?? "" });
    if (error) throw error;
  });
}

export function useAdminSettleOrder() {
  return useOrderAction(async ({ orderId, action, amount, note }: { orderId: string; action: "release" | "refund"; amount?: number | undefined; note?: string | undefined }) => {
    const { error } = await db.rpc("admin_settle_order", { p_order: orderId, p_action: action, ...(amount ? { p_amount: amount } : {}), p_note: note ?? "" });
    if (error) throw error;
  });
}

export type LedgerEntry = Database["public"]["Tables"]["escrow_ledger"]["Row"];

export function useEscrowLedger(orderId: string | undefined) {
  return useQuery({
    queryKey: ["escrow-ledger", orderId],
    enabled: !!orderId,
    queryFn: async (): Promise<LedgerEntry[]> => {
      const { data, error } = await db.from("escrow_ledger").select("*").eq("order_id", orderId!).order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}
