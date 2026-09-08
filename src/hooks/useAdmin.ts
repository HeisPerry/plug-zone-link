import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Database } from "@/integrations/supabase/types";

export type Withdrawal = Database["public"]["Tables"]["withdrawals"]["Row"];
export type AdRow = Database["public"]["Tables"]["ads"]["Row"];

export interface AdminOverview {
  total_users: number;
  total_ads: number;
  active_ads: number;
  total_orders: number;
  escrow_held: number;
  gross_sales: number;
  platform_fees: number;
  open_disputes: number;
  pending_withdrawals: number;
}

export function useIsAdmin() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" });
      if (error) throw error;
      return !!data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useAdminOverview(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-overview"],
    enabled,
    queryFn: async (): Promise<AdminOverview | null> => {
      const { data, error } = await supabase.rpc("admin_overview");
      if (error) throw error;
      const row = (data ?? [])[0];
      if (!row) return null;
      return {
        total_users: Number(row.total_users),
        total_ads: Number(row.total_ads),
        active_ads: Number(row.active_ads),
        total_orders: Number(row.total_orders),
        escrow_held: Number(row.escrow_held),
        gross_sales: Number(row.gross_sales),
        platform_fees: Number(row.platform_fees),
        open_disputes: Number(row.open_disputes),
        pending_withdrawals: Number(row.pending_withdrawals),
      };
    },
    staleTime: 30_000,
  });
}

export function useAdminWithdrawals(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-withdrawals"],
    enabled,
    queryFn: async (): Promise<Withdrawal[]> => {
      const { data, error } = await supabase.from("withdrawals").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 20_000,
  });
}

export function useSetWithdrawalStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: string; note?: string }) => {
      const { error } = await supabase.rpc("set_withdrawal_status", { p_withdrawal: id, p_status: status, p_note: note ?? "" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      qc.invalidateQueries({ queryKey: ["withdrawals"] });
      qc.invalidateQueries({ queryKey: ["seller-earnings"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
  });
}

export function useResolveDispute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, outcome, resolution, amount }: { id: string; outcome: string; resolution?: string; amount?: number }) => {
      const { error } = await supabase.rpc("resolve_dispute", { p_dispute: id, p_outcome: outcome, p_resolution: resolution ?? "", ...(amount ? { p_amount: amount } : {}) });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["disputes"] });
      qc.invalidateQueries({ queryKey: ["dispute-detail"] });
      qc.invalidateQueries({ queryKey: ["dispute"] });
      qc.invalidateQueries({ queryKey: ["order"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
  });
}

export function useAdminAds(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-ads"],
    enabled,
    queryFn: async (): Promise<AdRow[]> => {
      const { data, error } = await supabase.from("ads").select("*").order("created_at", { ascending: false }).limit(60);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 20_000,
  });
}

export function useSetAdStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "deleted" }) => {
      const { error } = await supabase.from("ads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-ads"] });
      qc.invalidateQueries({ queryKey: ["ads"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
  });
}
