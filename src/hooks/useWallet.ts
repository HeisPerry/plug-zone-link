import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Transaction } from "@/lib/types";

export interface WalletSummary {
  balance: number;
  earned: number;
  spent: number;
  pending: number;
  currency: string;
  transactions: Transaction[];
}

/** Wallet figures are derived from the transactions ledger (payee earnings minus nothing withdrawn yet). */
export function useWallet() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["wallet", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<WalletSummary> => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .or(`payer_id.eq.${user!.id},payee_id.eq.${user!.id}`)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const tx = (data ?? []) as Transaction[];
      let earned = 0;
      let spent = 0;
      let pending = 0;
      for (const t of tx) {
        const mine = t.payee_id === user!.id;
        if (t.status === "paid") {
          if (mine) earned += Number(t.seller_earnings);
          else spent += Number(t.amount);
        } else if (t.status === "pending" && mine) {
          pending += Number(t.seller_earnings);
        }
      }
      return { balance: earned, earned, spent, pending, currency: tx[0]?.currency ?? "NGN", transactions: tx };
    },
    staleTime: 30_000,
  });
}
