import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AdWithSeller } from "@/lib/types";

export const FEED_PAGE_SIZE = 20;

export interface FeedFilters {
  search: string;
  category: string;
  subcategory: string;
  minPrice: string;
  maxPrice: string;
}

export const EMPTY_FEED_FILTERS: FeedFilters = { search: "", category: "all", subcategory: "all", minPrice: "", maxPrice: "" };

function escapeLike(s: string) {
  return s.replace(/[%_,()]/g, (m) => `\\${m}`);
}

export function useDashboardFeed(filters: FeedFilters) {
  return useInfiniteQuery({
    queryKey: ["feed", filters],
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<AdWithSeller[]> => {
      let q = supabase
        .from("ads")
        .select("*, seller:profiles!ads_seller_id_fkey(id, username, display_name, avatar_url)")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .range(pageParam, pageParam + FEED_PAGE_SIZE - 1);

      const term = filters.search.trim();
      if (term) {
        const like = `%${escapeLike(term)}%`;
        q = q.or(`title.ilike.${like},description.ilike.${like}`);
      }
      if (filters.category !== "all") q = q.eq("category", filters.category);
      if (filters.subcategory !== "all") q = q.eq("subcategory", filters.subcategory);
      const min = Number(filters.minPrice);
      const max = Number(filters.maxPrice);
      if (filters.minPrice !== "" && !Number.isNaN(min)) q = q.gte("price", min);
      if (filters.maxPrice !== "" && !Number.isNaN(max)) q = q.lte("price", max);

      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as AdWithSeller[];
    },
    getNextPageParam: (lastPage, pages) => (lastPage.length < FEED_PAGE_SIZE ? undefined : pages.length * FEED_PAGE_SIZE),
  });
}
