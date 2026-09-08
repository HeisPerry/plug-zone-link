import { createFileRoute, Link } from "@tanstack/react-router";
import { Page, PageHero } from "@/components/layout/PageLayout";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/shared/SkeletonLoader";
import { CouponManager } from "@/components/coupons/CouponManager";
import { useMyCoupons } from "@/hooks/useCoupons";
import { useSellerProfile } from "@/hooks/useSeller";

export const Route = createFileRoute("/_authenticated/coupons")({
  head: () => ({
    meta: [
      { title: "Coupons — PlugZone" },
      { name: "description", content: "Create discount codes for your PlugZone listings: percentage or fixed-amount, with expiry dates and usage limits." },
      { property: "og:title", content: "Seller coupons on PlugZone" },
      { property: "og:description", content: "Create discount codes for your listings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CouponsPage,
});

function CouponsPage() {
  const { data: seller, isLoading: loadingSeller } = useSellerProfile();
  const { data: coupons, isLoading } = useMyCoupons();

  if (loadingSeller) {
    return (
      <Page>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-6 h-64 w-full" />
      </Page>
    );
  }

  if (!seller || seller.status !== "active") {
    return (
      <Page>
        <EmptyState
          title="Set up your store first"
          body="Coupons are for sellers. Create your seller account and you can start making discount codes."
          action={
            <Link to="/sell" className="btn btn-primary">
              Start selling
            </Link>
          }
        />
      </Page>
    );
  }

  return (
    <>
      <PageHero compact eyebrow="Selling" title="Coupons" subtitle="Give buyers a code for money off your listings. You control the amount, limits and expiry." />
      <Page>
        <CouponManager mode="seller" coupons={coupons} isLoading={isLoading} />
      </Page>
    </>
  );
}
