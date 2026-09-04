import { useState } from "react";
import { useDashboardFeed, EMPTY_FEED_FILTERS, type FeedFilters as Filters } from "@/hooks/useDashboardFeed";
import { useDebounce } from "@/hooks/useDebounce";
import { FeedFilters } from "./FeedFilters";
import { FeedCard, FeedCardSkeleton } from "./FeedCard";
import { EmptyState, ErrorState } from "@/components/shared/EmptyState";

export function DashboardFeed() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FEED_FILTERS);
  const debounced = useDebounce(filters, 300);
  const feed = useDashboardFeed(debounced);
  const ads = feed.data?.pages.flat() ?? [];
  const isFiltered = JSON.stringify(debounced) !== JSON.stringify(EMPTY_FEED_FILTERS);

  return (
    <section className="mt-12">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl">Latest listings</h2>
        <p className="text-[15px] text-muted-foreground">From everyone on PlugZone</p>
      </div>
      <div className="mt-4">
        <FeedFilters value={filters} onChange={setFilters} onClear={() => setFilters(EMPTY_FEED_FILTERS)} />
      </div>

      <div className="mt-6">
        {feed.isLoading ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <FeedCardSkeleton key={i} />
            ))}
          </ul>
        ) : feed.isError ? (
          <ErrorState message="Could not load listings." onRetry={() => feed.refetch()} />
        ) : ads.length === 0 ? (
          <EmptyState
            title={isFiltered ? "No listings match these filters" : "No listings yet"}
            body={isFiltered ? "Try a different search, category, or price range." : "Be the first to post an ad on PlugZone."}
            action={
              isFiltered ? (
                <button type="button" onClick={() => setFilters(EMPTY_FEED_FILTERS)} className="btn btn-secondary">
                  Show all listings
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ads.map((ad) => (
                <FeedCard key={ad.id} ad={ad} />
              ))}
            </ul>
            {feed.hasNextPage && (
              <div className="mt-6">
                <button type="button" onClick={() => feed.fetchNextPage()} disabled={feed.isFetchingNextPage} className="btn btn-secondary">
                  {feed.isFetchingNextPage ? "Loading…" : "Load more listings"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
