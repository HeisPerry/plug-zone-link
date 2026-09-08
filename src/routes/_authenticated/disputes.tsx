import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { Page, PageHero } from "@/components/layout/PageLayout";
import { EmptyState } from "@/components/shared/EmptyState";
import { ListSkeleton } from "@/components/shared/SkeletonLoader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useMyDisputes } from "@/hooks/useDisputes";
import { formatDate, formatPrice } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/disputes")({
  head: () => ({
    meta: [
      { title: "Reported problems — PlugZone" },
      { name: "description", content: "Follow up on orders you reported and see how each case is being handled." },
      { property: "og:title", content: "Reported problems on PlugZone" },
      { property: "og:description", content: "Track the orders you reported and their outcome." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DisputesPage,
});

function DisputesPage() {
  const { data, isLoading } = useMyDisputes();

  return (
    <>
      <PageHero compact eyebrow="Support" title="Reported problems" subtitle="Every order you reported, with the money kept on hold until the case is settled." />
      <Page>
        {isLoading ? (
          <ListSkeleton rows={4} />
        ) : !data?.length ? (
          <EmptyState title="Nothing reported" body="If an order goes wrong, open it and press “Report a problem”." />
        ) : (
          <ul className="panel divide-y overflow-hidden">
            {data.map((d) => (
              <li key={d.id}>
                <Link to="/dispute/$disputeId" params={{ disputeId: d.id }} className="flex items-center gap-4 px-5 py-4 hover:bg-muted">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <AlertTriangle size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{d.ad_title}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {d.order_number ? `${d.order_number} · ` : ""}
                      {d.reason.replace(/_/g, " ")} · {formatDate(d.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={d.status} className="hidden sm:inline-flex" />
                  <span className="font-heading font-bold">{formatPrice(d.total_price, d.currency)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Page>
    </>
  );
}
