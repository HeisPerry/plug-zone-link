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

export type PlatformSetting = Database["public"]["Tables"]["platform_settings"]["Row"];

export function usePlatformSettings(enabled = true) {
  return useQuery({
    queryKey: ["platform-settings"],
    enabled,
    queryFn: async (): Promise<PlatformSetting[]> => {
      const { data, error } = await supabase.from("platform_settings").select("*").order("key");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

export function useUpdateSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: number | string | boolean }) => {
      const { error } = await supabase.rpc("update_setting", { p_key: key, p_value: value });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform-settings"] }),
  });
}

export interface WeeklyStats {
  gmv: number;
  active_buyers: number;
  active_sellers: number;
  orders_count: number;
  escrow_volume: number;
  disputes_count: number;
  dispute_rate: number;
}

export function useAdminWeekly(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-weekly"],
    enabled,
    queryFn: async (): Promise<WeeklyStats | null> => {
      const { data, error } = await supabase.rpc("admin_weekly_stats");
      if (error) throw error;
      const row = (data ?? [])[0];
      if (!row) return null;
      return {
        gmv: Number(row.gmv),
        active_buyers: Number(row.active_buyers),
        active_sellers: Number(row.active_sellers),
        orders_count: Number(row.orders_count),
        escrow_volume: Number(row.escrow_volume),
        disputes_count: Number(row.disputes_count),
        dispute_rate: Number(row.dispute_rate),
      };
    },
    staleTime: 60_000,
  });
}

export function useIsSuperAdmin() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["is-super-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_super_admin", { _user: user!.id });
      if (error) throw error;
      return !!data;
    },
    staleTime: 5 * 60_000,
  });
}

export interface AdminPerson {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_super: boolean;
  since: string;
}

export function useAdminTeam(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-team"],
    enabled,
    queryFn: async (): Promise<AdminPerson[]> => {
      const { data, error } = await supabase.rpc("list_admins");
      if (error) throw error;
      return (data ?? []) as AdminPerson[];
    },
    staleTime: 30_000,
  });
}

export type AdminInvite = Database["public"]["Tables"]["admin_invites"]["Row"];

export function useAdminInvites(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-invites"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("admin_invites").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      const invites = (data ?? []) as AdminInvite[];
      const ids = [...new Set(invites.map((i) => i.invitee_id))];
      const { data: profiles } = ids.length ? await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", ids) : { data: [] };
      const pMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      return invites.map((i) => ({ ...i, invitee: pMap.get(i.invitee_id) ?? null }));
    },
    staleTime: 20_000,
  });
}

export function useAdminTeamActions() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-team"] });
    qc.invalidateQueries({ queryKey: ["admin-invites"] });
    qc.invalidateQueries({ queryKey: ["my-admin-invites"] });
  };
  const invite = useMutation({
    mutationFn: async ({ userId, note }: { userId: string; note?: string }) => {
      const { error } = await supabase.rpc("invite_admin", { p_user: userId, p_note: note ?? "" });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const revoke = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase.rpc("revoke_admin_invite", { p_invite: inviteId });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("remove_admin", { p_user: userId });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  return { invite, revoke, remove };
}

/** Pending admin invites addressed to the signed-in user. */
export function useMyAdminInvites() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-admin-invites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("admin_invites").select("*").eq("invitee_id", user!.id).eq("status", "pending").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdminInvite[];
    },
  });
}

export function useRespondAdminInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "accept" | "decline" }) => {
      const { error } = await supabase.rpc("respond_admin_invite", { p_invite: id, p_action: action });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-admin-invites"] });
      qc.invalidateQueries({ queryKey: ["is-admin"] });
      qc.invalidateQueries({ queryKey: ["admin-team"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
