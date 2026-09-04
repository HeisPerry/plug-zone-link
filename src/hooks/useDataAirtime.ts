import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { generateReference } from "@/lib/utils";
import type { Provider } from "@/lib/constants";

export function useDataAirtimeOrders() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["data-airtime-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_airtime_orders")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
  });
}

export function usePlaceDataAirtimeOrder() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { type: "data" | "airtime"; provider: Provider; phone_number: string; amount: number; data_plan?: string; recipient: "self" | "others" }) => {
      if (!user) throw new Error("Not signed in");
      const reference = generateReference(input.type === "data" ? "PZD" : "PZA");

      // PAYMENT INTEGRATION POINT:
      // Initialise a Paystack / Flutterwave transaction here with `reference` and `input.amount`.
      // On a successful charge, a server route should verify the payment and flip status to
      // 'processing' -> 'completed' after the VTU provider confirms delivery.
      // For now the order is saved as 'pending'.

      const { data, error } = await supabase
        .from("data_airtime_orders")
        .insert({ user_id: user.id, reference, ...input, data_plan: input.data_plan ?? null })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["data-airtime-orders", user?.id] }),
  });
}
