import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useMonthCheckins(month: Date) {
  const { user } = useAuth();
  const from = format(startOfMonth(month), "yyyy-MM-dd");
  const to = format(endOfMonth(month), "yyyy-MM-dd");
  return useQuery({
    queryKey: ["checkins", user?.id, from],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_checkins")
        .select("check_in_date, streak_count")
        .eq("user_id", user!.id)
        .gte("check_in_date", from)
        .lte("check_in_date", to);
      if (error) throw error;
      return new Set(data.map((d) => d.check_in_date));
    },
  });
}

export function useCheckIn() {
  const { refreshProfile, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("daily_check_in");
      if (error) throw error;
      return data[0]!;
    },
    onSuccess: async () => {
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ["checkins", user?.id] });
    },
  });
}
