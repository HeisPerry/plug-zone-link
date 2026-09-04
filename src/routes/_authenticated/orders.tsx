import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { Page, PageHero } from "@/components/layout/PageLayout";
import { useOrders, useUpdateOrderStatus } from "@/hooks/useOrders";
import { useAuth } from "@/hooks/useAuth";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ListSkeleton } from "@/components/shared/SkeletonLoader";
import { EmptyState, ErrorState } from "@/components/shared/EmptyState";
import { useToast } from "@/components/shared/Toast";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import type { Order, OrderWithDetails } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [{ title: "Orders — PlugZone" }] }),
  component: OrdersPage,
});

function OrdersPage() {
  const [tab, setTab] = useState<"buying" | "selling">("buying");
  const { data, isLoading, isError, refetch } = useOrders(tab);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <>
      <PageHero compact eyebrow="Orders" title="Your orders" subtitle="Everything you're buying and selling, with live status updates." />
    <Page wide className="pt-4">
      <div className="flex border-b">
        {(["buying", "selling"] as const).map((t) => (
          <button key={t} className="tab capitalize" data-active={tab === t} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {isLoading ? (
          <ListSkeleton rows={5} />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !data?.length ? (
          <EmptyState
            title={tab === "buying" ? "You haven't placed any orders" : "No one has ordered from you yet"}
            body={tab === "buying" ? "Find an ad you like and place an order to see it here." : "Share your ads with friends to get your first order."}
            action={
              tab === "selling" ? (
                <Link to="/ads" className="btn btn-primary">
                  Go to My Ads
                </Link>
              ) : (
                <Link to="/" className="btn btn-primary">
                  Browse Ads
                </Link>
              )
            }
          />
        ) : (
          <ul className="panel divide-y overflow-hidden px-5">
            {data.map((o) => (
              <OrderItem key={o.id} order={o} side={tab} expanded={open === o.id} onToggle={() => setOpen(open === o.id ? null : o.id)} />
            ))}
          </ul>
        )}
      </div>
    </Page>
    </>
  );
}

function OrderItem({ order: o, side, expanded, onToggle }: { order: OrderWithDetails; side: "buying" | "selling"; expanded: boolean; onToggle: () => void }) {
  const { user } = useAuth();
  const toast = useToast();
  const update = useUpdateOrderStatus();
  const other = side === "buying" ? o.seller : o.buyer;

  const setStatus = (status: Order["status"], msg: string) => update.mutate({ id: o.id, status }, { onSuccess: () => toast.success(msg), onError: (e) => toast.error(e.message) });

  const isBuyer = o.buyer_id === user?.id;
  const actions: { label: string; status: Order["status"]; msg: string; kind: "primary" | "secondary" }[] = [];
  if (!isBuyer && o.status === "pending") actions.push({ label: "Accept Order", status: "accepted", msg: "Order accepted", kind: "primary" });
  if (!isBuyer && o.status === "accepted") actions.push({ label: "Mark Completed", status: "completed", msg: "Order completed", kind: "primary" });
  if (o.status === "pending" || o.status === "accepted") actions.push({ label: "Cancel Order", status: "cancelled", msg: "Order cancelled", kind: "secondary" });

  return (
    <li>
      <button onClick={onToggle} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 py-4 text-left" aria-expanded={expanded}>
        <span className="min-w-0 flex-1 basis-56 truncate font-medium">{o.ad.title}</span>
        <span className="text-[15px] text-muted-foreground">@{other.username}</span>
        <span className="text-[15px] text-muted-foreground">×{o.quantity}</span>
        <span className="font-medium">{formatPrice(o.total_price, o.ad.currency)}</span>
        <StatusBadge status={o.status} />
        <span className="text-sm text-muted-foreground">{formatDate(o.created_at)}</span>
        <ChevronDown size={18} className={cn("text-muted-foreground transition-transform", expanded && "rotate-180")} />
      </button>
      {expanded && (
        <div className="mb-5 rounded-md bg-muted p-4 sm:p-5">
          <dl className="grid gap-x-8 gap-y-2 text-[15px] sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">Ad</dt>
              <dd>
                <Link to="/ad/$adId" params={{ adId: o.ad_id }} className="font-medium text-primary">
                  {o.ad.title}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">{isBuyer ? "Seller" : "Buyer"}</dt>
              <dd>
                <Link to="/user/$username" params={{ username: other.username }} className="font-medium text-primary">
                  {other.display_name} (@{other.username})
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Quantity</dt>
              <dd>{o.quantity}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Total</dt>
              <dd>{formatPrice(o.total_price, o.ad.currency)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Payment</dt>
              <dd>
                <StatusBadge status={o.payment_status} />
              </dd>
            </div>
            {o.notes && (
              <div className="sm:col-span-2">
                <dt className="text-sm text-muted-foreground">Note</dt>
                <dd className="whitespace-pre-line">{o.notes}</dd>
              </div>
            )}
          </dl>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {actions.map((a) => (
              <button key={a.status} className={cn("btn btn-sm", a.kind === "primary" ? "btn-primary" : "btn-secondary")} disabled={update.isPending} onClick={() => setStatus(a.status, a.msg)}>
                {a.label}
              </button>
            ))}
            {o.status !== "completed" && o.status !== "cancelled" && o.status !== "disputed" && (
              <button className="ml-auto text-sm text-destructive" onClick={() => setStatus("disputed", "Issue reported")}>
                Report Issue
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
