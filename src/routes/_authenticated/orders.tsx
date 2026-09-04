import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { Page } from "@/components/layout/PageLayout";
import { useAllOrders, useUpdateOrderStatus } from "@/hooks/useOrders";
import { useAuth } from "@/hooks/useAuth";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ListSkeleton } from "@/components/shared/SkeletonLoader";
import { ErrorState } from "@/components/shared/EmptyState";
import { useToast } from "@/components/shared/Toast";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import type { Order, OrderWithDetails } from "@/lib/types";
import emptyOrders from "@/assets/empty-orders.png";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [{ title: "Orders — PlugZone" }] }),
  component: OrdersPage,
});

type Tab = "all" | "pending" | "completed" | "cancelled";
const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

function matchesTab(o: Order, tab: Tab) {
  if (tab === "all") return true;
  if (tab === "pending") return o.status === "pending" || o.status === "accepted" || o.status === "disputed";
  if (tab === "cancelled") return o.status === "cancelled" || o.status === "refunded";
  return o.status === tab;
}

function OrdersPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("all");
  const { data, isLoading, isError, refetch } = useAllOrders();
  const [open, setOpen] = useState<string | null>(null);
  const filtered = useMemo(() => (data ?? []).filter((o) => matchesTab(o, tab)), [data, tab]);

  return (
    <Page wide className="pt-8">
      <h1 className="font-heading text-[28px] font-bold tracking-tight sm:text-[32px]">Orders</h1>
      <div className="mt-6 flex gap-2 overflow-x-auto border-b hide-scrollbar">
        {TABS.map((t) => (
          <button key={t.key} className="tab text-[17px] sm:text-[19px]" data-active={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {isLoading ? (
          <ListSkeleton rows={5} />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !filtered.length ? (
          <div className="flex flex-col items-center px-4 py-10 text-center sm:py-14 rise-in">
            <img src={emptyOrders} alt="" width={1024} height={768} loading="lazy" className="w-full max-w-[420px]" />
            <h2 className="mt-4 font-heading text-[26px] font-bold tracking-tight sm:text-[32px]">No orders found</h2>
            <p className="mt-2 text-[17px] text-muted-foreground">
              {tab === "all" ? "You have not made any orders yet." : `You have no ${tab} orders.`}
            </p>
            <Link to="/" className="btn btn-primary btn-lg mt-7">
              Go to Marketplace
            </Link>
          </div>
        ) : (
          <ul className="panel divide-y overflow-hidden px-5">
            {filtered.map((o) => (
              <OrderItem key={o.id} order={o} side={o.buyer_id === user?.id ? "buying" : "selling"} expanded={open === o.id} onToggle={() => setOpen(open === o.id ? null : o.id)} />
            ))}
          </ul>
        )}
      </div>
    </Page>
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
        <span className="pill text-xs capitalize">{side}</span>
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
