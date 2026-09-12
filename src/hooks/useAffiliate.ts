import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { useAuth } from "./useAuth";
import type { Database } from "@/integrations/supabase/types";

export type RewardEntry = Database["public"]["Tables"]["reward_entries"]["Row"];
export type RewardKind = "affiliate" | "referral";

export interface RewardBalance {
  kind: RewardKind;
  earned: number;
  pending: number;
  withdrawn: number;
  pending_withdrawals: number;
  available: number;
}

const ZERO = (kind: RewardKind): RewardBalance => ({ kind, earned: 0, pending: 0, withdrawn: 0, pending_withdrawals: 0, available: 0 });

export function useAffiliateStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["affiliate", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db.from("affiliate_clicks").select("converted").eq("affiliate_user_id", user!.id);
      if (error) throw error;
      const clicks = data.length;
      const signups = data.filter((c) => c.converted).length;
      return { clicks, signups, rate: clicks ? Math.round((signups / clicks) * 100) : 0 };
    },
  });
}

/** Separate balances: affiliate commissions and referral rewards, each with its own payouts. */
export function useRewardBalances() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["reward-balances", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Record<RewardKind, RewardBalance>> => {
      const { data, error } = await db.rpc("get_reward_balances", { p_user: user!.id });
      if (error) throw error;
      const out: Record<RewardKind, RewardBalance> = { affiliate: ZERO("affiliate"), referral: ZERO("referral") };
      for (const row of data ?? []) {
        const kind = row.kind as RewardKind;
        if (kind !== "affiliate" && kind !== "referral") continue;
        out[kind] = {
          kind,
          earned: Number(row.earned ?? 0),
          pending: Number(row.pending ?? 0),
          withdrawn: Number(row.withdrawn ?? 0),
          pending_withdrawals: Number(row.pending_withdrawals ?? 0),
          available: Number(row.available ?? 0),
        };
      }
      return out;
    },
    staleTime: 30_000,
  });
}

export function useRewardEntries() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["reward-entries", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<RewardEntry[]> => {
      const { data, error } = await supabase
        .from("reward_entries")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

/** People who signed up with this member's link. */
export function useReferredMembers() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["referred-members", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, created_at")
        .eq("referred_by", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

const CLICK_KEY = "plugzone_ref";

export function rememberReferral(code: string, clickId: string | null) {
  try {
    localStorage.setItem(CLICK_KEY, JSON.stringify({ code, clickId }));
  } catch {
    /* ignore */
  }
}

export function readReferral(): { code: string; clickId: string | null } | null {
  try {
    const raw = localStorage.getItem(CLICK_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearReferral() {
  try {
    localStorage.removeItem(CLICK_KEY);
  } catch {
    /* ignore */
  }
}
