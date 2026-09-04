import { createFileRoute } from "@tanstack/react-router";
import { Page, PageHeader } from "@/components/layout/PageLayout";
import { AdForm } from "@/components/ads/AdForm";

export const Route = createFileRoute("/_authenticated/ads/new")({
  head: () => ({ meta: [{ title: "Post a new ad — PlugZone" }] }),
  component: () => (
    <Page>
      <PageHeader title="Post a new ad" subtitle="Clear photos and an honest description get more orders." />
      <div className="mt-8">
        <AdForm />
      </div>
    </Page>
  ),
});
