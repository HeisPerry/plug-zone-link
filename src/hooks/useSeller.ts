import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Database } from "@/integrations/supabase/types";

export type SellerProfile = Database["public"]["Tables"]["seller_profiles"]["Row"];
export type Withdrawal = Database["public"]["Tables"]["withdrawals"]["Row"];

export interface SellerEarnings {
  total_sales: number;
  platform_fees: number;
  escrow_held: number;
  released: number;
  withdrawn: number;
  pending_withdrawals: number;
  available: number;
}

const ZERO: SellerEarnings = {
  total_sales: 0,
  platform_fees: 0,
  escrow_held: 0,
  released: 0,
  withdrawn: 0,
  pending_withdrawals: 0,
  available: 0,
};

/** The signed-in member's seller account, or null when they haven't set one up. */
export function useSellerProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["seller-profile", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<SellerProfile | null> => {
      const { data, error } = await supabase.from("seller_profiles").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
    staleTime: 60_000,
  });
}

export interface BecomeSellerInput {
  businessName: string;
  about: string;
  contactEmail: string;
  contactPhone: string;
  payoutMethod: string;
  payoutAccountName: string;
  payoutBank: string;
  payoutAccountNumber: string;
}

export function useBecomeSeller() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: BecomeSellerInput) => {
      const { data, error } = await supabase.rpc("become_seller", {
        p_business_name: input.businessName,
        p_about: input.about,
        p_contact_email: input.contactEmail,
        p_contact_phone: input.contactPhone,
        p_payout_method: input.payoutMethod,
        p_payout_account_name: input.payoutAccountName,
        p_payout_bank: input.payoutBank,
        p_payout_account_number: input.payoutAccountNumber,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seller-profile"] });
      qc.invalidateQueries({ queryKey: ["seller-earnings"] });
    },
  });
}

export function useSellerEarnings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["seller-earnings", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<SellerEarnings> => {
      const { data, error } = await supabase.rpc("get_seller_earnings", { p_user: user!.id });
      if (error) throw error;
      const row = (data ?? [])[0];
      if (!row) return ZERO;
      return {
        total_sales: Number(row.total_sales ?? 0),
        platform_fees: Number(row.platform_fees ?? 0),
        escrow_held: Number(row.escrow_held ?? 0),
        released: Number(row.released ?? 0),
        withdrawn: Number(row.withdrawn ?? 0),
        pending_withdrawals: Number(row.pending_withdrawals ?? 0),
        available: Number(row.available ?? 0),
      };
    },
    staleTime: 30_000,
  });
}

export function useWithdrawals() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["withdrawals", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Withdrawal[]> => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*")
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

export function useRequestWithdrawal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ amount, method, destination }: { amount: number; method: string; destination: string }) => {
      const { data, error } = await supabase.rpc("request_withdrawal", {
        p_amount: amount,
        p_method: method,
        p_destination: destination,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["withdrawals"] });
      qc.invalidateQueries({ queryKey: ["seller-earnings"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}
