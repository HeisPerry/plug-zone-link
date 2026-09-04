import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useAffiliateStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["affiliate", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("affiliate_clicks").select("converted").eq("affiliate_user_id", user!.id);
      if (error) throw error;
      const clicks = data.length;
      const signups = data.filter((c) => c.converted).length;
      return { clicks, signups, rate: clicks ? Math.round((signups / clicks) * 100) : 0 };
    },
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
