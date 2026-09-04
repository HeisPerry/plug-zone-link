import { createFileRoute } from "@tanstack/react-router";
import { Page, PageHeader } from "@/components/layout/PageLayout";
import { AdForm } from "@/components/ads/AdForm";
import { useAd } from "@/hooks/useAds";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/shared/SkeletonLoader";
import { ErrorState } from "@/components/shared/EmptyState";

export const Route = createFileRoute("/_authenticated/ads/$adId/edit")({
  head: () => ({ meta: [{ title: "Edit ad — PlugZone" }] }),
  component: EditAdPage,
});

function EditAdPage() {
  const { adId } = Route.useParams();
  const { user } = useAuth();
  const { data: ad, isLoading, refetch } = useAd(adId);

  return (
    <Page>
      <PageHeader title="Edit ad" />
      <div className="mt-8">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-11 w-1/2" />
          </div>
        ) : !ad || ad.seller_id !== user?.id ? (
          <ErrorState message="This ad doesn't exist or isn't yours to edit." onRetry={() => refetch()} />
        ) : (
          <AdForm ad={ad} />
        )}
      </div>
    </Page>
  );
}
