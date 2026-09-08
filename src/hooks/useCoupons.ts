import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Database } from "@/integrations/supabase/types";

export type Coupon = Database["public"]["Tables"]["coupons"]["Row"];
export type CouponRedemption = Database["public"]["Tables"]["coupon_redemptions"]["Row"];

export interface CouponQuote {
  coupon_id: string;
  code: string;
  subtotal: number;
  discount: number;
  total: number;
  label: string;
}

export interface CouponInput {
  code: string;
  scope: "seller" | "platform";
  discount_type: "percent" | "fixed";
  discount_value: number;
  max_discount: number | null;
  currency: string | null;
  min_order_value: number;
  max_uses: number | null;
  per_user_limit: number | null;
  ad_id: string | null;
  category: string | null;
  first_order_only: boolean;
  expires_at: string | null;
  description: string | null;
}

/** Coupons the signed-in seller owns (admins see everything via `useAllCoupons`). */
export function useMyCoupons() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["coupons", "mine", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Coupon[]> => {
      const { data, error } = await supabase.from("coupons").select("*").eq("owner_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAllCoupons(enabled: boolean) {
  return useQuery({
    queryKey: ["coupons", "all"],
    enabled,
    queryFn: async (): Promise<Coupon[]> => {
      const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateCoupon() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: CouponInput) => {
      const { error } = await supabase.from("coupons").insert({
        ...input,
        owner_id: input.scope === "seller" ? user!.id : null,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coupons"] }),
  });
}

export function useSetCouponActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("coupons").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coupons"] }),
  });
}

export function useDeleteCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coupons"] }),
  });
}

/** Checks a code against a listing on the backend and returns the discounted totals. */
export function useValidateCoupon() {
  return useMutation({
    mutationFn: async ({ code, adId, quantity }: { code: string; adId: string; quantity: number }): Promise<CouponQuote> => {
      const { data, error } = await supabase.rpc("validate_coupon", { p_code: code, p_ad: adId, p_quantity: quantity });
      if (error) throw error;
      const row = (data as CouponQuote[] | null)?.[0];
      if (!row) throw new Error("That coupon code is not valid");
      return {
        ...row,
        subtotal: Number(row.subtotal),
        discount: Number(row.discount),
        total: Number(row.total),
      };
    },
  });
}
