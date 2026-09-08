import { createFileRoute, Link } from "@tanstack/react-router";
import { Store } from "lucide-react";
import { Page, PageHeader } from "@/components/layout/PageLayout";
import { AdForm } from "@/components/ads/AdForm";
import { Skeleton } from "@/components/shared/SkeletonLoader";
import { useSellerProfile } from "@/hooks/useSeller";

export const Route = createFileRoute("/_authenticated/ads/new")({
  head: () => ({ meta: [{ title: "Post a new ad — PlugZone" }, { name: "description", content: "List a digital item on PlugZone and get paid safely through escrow." }] }),
  component: NewAdPage,
});

function NewAdPage() {
  const { data: seller, isLoading } = useSellerProfile();

  if (isLoading) {
    return (
      <Page>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-6 h-64 w-full" />
      </Page>
    );
  }

  if (!seller) {
    return (
      <Page>
        <PageHeader title="Set up your store first" subtitle="It takes a minute. Add your store name and where you want your money sent, then post as many items as you like." />
        <Link to="/sell" className="btn btn-primary mt-6">
          <Store size={18} /> Start selling
        </Link>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader title="Post a new ad" subtitle="Clear photos and an honest description get more orders." />
      <div className="mt-8">
        <AdForm />
      </div>
    </Page>
  );
}
