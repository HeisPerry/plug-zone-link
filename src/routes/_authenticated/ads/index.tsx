import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Page, PageHeader } from "@/components/layout/PageLayout";
import { useMyAds, useUpdateAdStatus } from "@/hooks/useAds";
import { useDebounce } from "@/hooks/useDebounce";
import { AdRow } from "@/components/ads/AdRow";
import { ListSkeleton } from "@/components/shared/SkeletonLoader";
import { EmptyState, ErrorState } from "@/components/shared/EmptyState";
import { Pagination } from "@/components/shared/Pagination";
import { Modal } from "@/components/shared/Modal";
import { useToast } from "@/components/shared/Toast";
import { ADS_PER_PAGE } from "@/lib/constants";
import type { Ad } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/ads/")({
  head: () => ({ meta: [{ title: "My Ads — PlugZone" }] }),
  component: MyAdsPage,
});

function MyAdsPage() {
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search, 300);
  const { data, isLoading, isError, refetch } = useMyAds({ status, search: debounced, page });
  const update = useUpdateAdStatus();
  const toast = useToast();
  const [deleting, setDeleting] = useState<Ad | null>(null);

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / ADS_PER_PAGE));

  return (
    <Page wide>
      <PageHeader
        title="My Ads"
        action={
          <Link to="/ads/new" className="btn btn-primary">
            <Plus size={18} /> Post New Ad
          </Link>
        }
      />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <select
          className="input sm:w-44"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="sold">Sold</option>
        </select>
        <input
          className="input"
          placeholder="Search your ads"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="mt-6">
        {isLoading ? (
          <ListSkeleton rows={6} />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !data?.ads.length ? (
          <EmptyState
            title={search || status !== "all" ? "No ads match these filters" : "You haven't posted any ads yet"}
            body={search || status !== "all" ? "Try a different status or search term." : "Post your first ad to start selling."}
            action={
              !search && status === "all" ? (
                <Link to="/ads/new" className="btn btn-primary">
                  Post an Ad
                </Link>
              ) : undefined
            }
          />
        ) : (
          <ul className="divide-y border-y">
            {data.ads.map((ad) => (
              <AdRow
                key={ad.id}
                ad={ad}
                actions={
                  <>
                    <Link to="/ads/$adId/edit" params={{ adId: ad.id }} className="btn btn-secondary btn-sm">
                      Edit
                    </Link>
                    {ad.status !== "sold" && (
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={update.isPending}
                        onClick={() =>
                          update.mutate(
                            { id: ad.id, status: ad.status === "paused" ? "active" : "paused" },
                            { onSuccess: () => toast.success(ad.status === "paused" ? "Ad resumed" : "Ad paused") },
                          )
                        }
                      >
                        {ad.status === "paused" ? "Resume" : "Pause"}
                      </button>
                    )}
                    {ad.status === "active" && (
                      <button className="btn btn-secondary btn-sm" onClick={() => update.mutate({ id: ad.id, status: "sold" }, { onSuccess: () => toast.success("Marked as sold") })}>
                        Mark Sold
                      </button>
                    )}
                    <button className="btn btn-ghost btn-sm text-destructive" onClick={() => setDeleting(ad)}>
                      Delete
                    </button>
                  </>
                }
              />
            ))}
          </ul>
        )}
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete this ad?">
        <p className="text-[15px] text-muted-foreground">"{deleting?.title}" will be removed from the marketplace. This can't be undone.</p>
        <div className="mt-6 flex gap-2">
          <button
            className="btn btn-danger"
            disabled={update.isPending}
            onClick={() =>
              deleting &&
              update.mutate(
                { id: deleting.id, status: "deleted" },
                {
                  onSuccess: () => {
                    toast.success("Ad deleted");
                    setDeleting(null);
                  },
                },
              )
            }
          >
            Delete Ad
          </button>
          <button className="btn btn-secondary" onClick={() => setDeleting(null)}>
            Keep it
          </button>
        </div>
      </Modal>
    </Page>
  );
}
