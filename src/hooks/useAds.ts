import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { ADS_PER_PAGE, STORAGE_BUCKET } from "@/lib/constants";
import type { Ad, AdWithSeller } from "@/lib/types";
import type { AdFormValues } from "@/lib/validators";

export function useMyAds(opts: { status: string; search: string; page: number }) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-ads", user?.id, opts],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase
        .from("ads")
        .select("*", { count: "exact" })
        .eq("seller_id", user!.id)
        .neq("status", "deleted")
        .order("created_at", { ascending: false })
        .range((opts.page - 1) * ADS_PER_PAGE, opts.page * ADS_PER_PAGE - 1);
      if (opts.status !== "all") q = q.eq("status", opts.status);
      if (opts.search.trim()) q = q.ilike("title", `%${opts.search.trim()}%`);
      const { data, error, count } = await q;
      if (error) throw error;
      return { ads: data, total: count ?? 0 };
    },
  });
}

export function useAd(adId: string) {
  return useQuery({
    queryKey: ["ad", adId],
    queryFn: async (): Promise<AdWithSeller | null> => {
      const { data, error } = await supabase.from("ads").select("*").eq("id", adId).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { data: seller } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .eq("id", data.seller_id)
        .single();
      return { ...data, seller: seller ?? { id: data.seller_id, username: "unknown", display_name: "Unknown", avatar_url: null } };
    },
  });
}

export function useUserActiveAds(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-ads", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ads")
        .select("*")
        .eq("seller_id", userId!)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });
}

export function useRecentAds(limit = 8) {
  return useQuery({
    queryKey: ["recent-ads", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ads")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });
}

export async function uploadAdImage(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  // Bucket is private: issue a long-lived signed URL so listings render for everyone.
  const { data, error: signErr } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  if (signErr || !data) throw signErr ?? new Error("Could not create image URL");
  return data.signedUrl;
}

export function useSaveAd() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values, images, details }: { id?: string | undefined; values: AdFormValues; images: string[]; details: Record<string, string> }) => {
      if (!user) throw new Error("Not signed in");
      const payload = {
        title: values.title,
        description: values.description,
        price: values.price,
        currency: values.currency,
        category: values.category,
        subcategory: values.subcategory,
        details,
        location: values.location || null,
        images,
      };
      if (id) {
        const { data, error } = await supabase.from("ads").update(payload).eq("id", id).select("*").single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase.from("ads").insert({ ...payload, seller_id: user.id }).select("*").single();
      if (error) throw error;
      return data;
    },
    onSuccess: (ad: Ad) => {
      queryClient.invalidateQueries({ queryKey: ["my-ads"] });
      queryClient.invalidateQueries({ queryKey: ["ad", ad.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateAdStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Ad["status"] }) => {
      const { error } = await supabase.from("ads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["my-ads"] });
      queryClient.invalidateQueries({ queryKey: ["ad", vars.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
