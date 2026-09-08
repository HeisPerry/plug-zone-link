import { useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ShieldCheck, Truck, PackageCheck, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, Page, PageHeader } from "@/components/layout/PageLayout";
import { useAuth } from "@/hooks/useAuth";
import { useOrder, useOrderEvents, useOrderDispute, useSetFulfilment, useConfirmReceipt, useOpenDispute } from "@/hooks/useCheckout";
import { usePayForOrder } from "@/hooks/useCheckout";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Skeleton } from "@/components/shared/SkeletonLoader";
import { Modal } from "@/components/shared/Modal";
import { Field } from "@/components/shared/Field";
import { useToast } from "@/components/shared/Toast";
import { formatDate, formatPrice } from "@/lib/utils";

export const Route = createFileRoute("/order/$orderId")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
  },
  head: () => ({ meta: [{ title: "Order — PlugZone" }, { name: "description", content: "Track your PlugZone order, escrow status, and delivery updates." }] }),
  component: OrderDetailPage,
});

const ESCROW_LABEL: Record<string, string> = {
  none: "Awaiting payment",
  held: "Money held safely",
  released: "Paid out to seller",
  refunded: "Refunded to buyer",
  disputed: "Frozen — under review",
};

function OrderDetailPage() {
  const { orderId } = Route.useParams();
  const { user } = useAuth();
  const toast = useToast();
  const { data: order, isLoading } = useOrder(orderId);
  const { data: events } = useOrderEvents(orderId);
  const { data: dispute } = useOrderDispute(orderId);
  const pay = usePayForOrder();
  const fulfil = useSetFulfilment();
  const confirm = useConfirmReceipt();
  const openDispute = useOpenDispute();

  const [shipOpen, setShipOpen] = useState(false);
  const [trackingNote, setTrackingNote] = useState("");
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [reason, setReason] = useState("item_not_received");
  const [description, setDescription] = useState("");

  if (isLoading) {
    return (
      <AppShell>
        <Page>
          <Skeleton className="h-10 w-64" />
          <Skeleton className="mt-6 h-72 w-full" />
        </Page>
      </AppShell>
    );
  }

  if (!order) {
    return (
      <AppShell>
        <Page>
          <PageHeader title="Order not found" subtitle="This order may have been removed, or it isn't yours." />
          <Link to="/orders" className="btn btn-primary mt-6">
            Back to orders
          </Link>
        </Page>
      </AppShell>
    );
  }

  const isBuyer = order.buyer_id === user?.id;
  const other = isBuyer ? order.seller : order.buyer;
  const escrow = order.escrow_status ?? "none";

  return (
    <AppShell>
      <Page className="pt-8">
        <PageHeader
          title={`Order ${order.order_number ?? ""}`.trim()}
          subtitle={`${isBuyer ? "Buying from" : "Selling to"} @${other.username} · placed ${formatDate(order.created_at)}`}
          action={
            <Link to="/orders" className="btn btn-secondary btn-sm">
              All orders
            </Link>
          }
        />

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            <section className="panel p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {order.ad.images[0] && <img src={order.ad.images[0]} alt="" className="h-14 w-14 rounded-md object-cover" loading="lazy" />}
                  <div>
                    <p className="font-medium">{order.ad.title}</p>
                    <p className="text-[15px] text-muted-foreground">
                      {order.quantity} × · {formatPrice(order.total_price, order.ad.currency)}
                    </p>
                  </div>
                </div>
                <StatusBadge status={order.status} />
              </div>

              <p className="mt-5 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-[15px]">
                <ShieldCheck size={16} className="text-primary" aria-hidden="true" />
                {ESCROW_LABEL[escrow] ?? escrow}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {isBuyer && order.payment_status !== "paid" && (
                  <button
                    className="btn btn-primary"
                    disabled={pay.isPending}
                    onClick={() => pay.mutate(order.id, { onSuccess: () => toast.success("Payment held in escrow"), onError: (e) => toast.error(e.message) })}
                  >
                    {pay.isPending ? "Processing…" : "Pay now"}
                  </button>
                )}
                {!isBuyer && escrow === "held" && order.status !== "shipped" && order.status !== "delivered" && (
                  <button className="btn btn-primary" onClick={() => setShipOpen(true)}>
                    <Truck size={16} aria-hidden="true" /> Mark as sent
                  </button>
                )}
                {!isBuyer && order.status === "shipped" && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => fulfil.mutate({ orderId: order.id, stage: "delivered" }, { onSuccess: () => toast.success("Marked delivered"), onError: (e) => toast.error(e.message) })}
                  >
                    <PackageCheck size={16} aria-hidden="true" /> Mark as delivered
                  </button>
                )}
                {isBuyer && escrow === "held" && (
                  <button
                    className="btn btn-primary"
                    disabled={confirm.isPending}
                    onClick={() => confirm.mutate(order.id, { onSuccess: () => toast.success("Thanks — the seller has been paid"), onError: (e) => toast.error(e.message) })}
                  >
                    Confirm I received it
                  </button>
                )}
                {!dispute && (escrow === "held" || order.status === "delivered") && (
                  <button className="btn btn-ghost" onClick={() => setDisputeOpen(true)}>
                    <AlertTriangle size={16} aria-hidden="true" /> Report a problem
                  </button>
                )}
              </div>

              {dispute && (
                <div className="mt-5 rounded-lg border border-destructive/30 p-4">
                  <p className="font-medium text-destructive">A problem was reported</p>
                  <p className="mt-1 text-[15px] text-muted-foreground">{dispute.description}</p>
                  <p className="mt-2 text-[13px] text-muted-foreground">Status: {dispute.status.replace(/_/g, " ")}</p>
                </div>
              )}
            </section>

            <section className="panel p-5">
              <h2 className="text-lg">Order history</h2>
              <ol className="mt-4 space-y-3">
                {(events ?? []).map((e) => (
                  <li key={e.id} className="flex gap-3 text-[15px]">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>
                      <span className="capitalize">{(e.note ?? e.status).replace(/_/g, " ")}</span>
                      <span className="ml-2 text-[13px] text-muted-foreground">{formatDate(e.created_at)}</span>
                    </span>
                  </li>
                ))}
                {!events?.length && <li className="text-[15px] text-muted-foreground">Nothing has happened yet.</li>}
              </ol>
            </section>
          </div>

          <aside className="panel h-fit space-y-3 p-5 text-[15px]">
            <h2 className="text-lg">Delivery details</h2>
            <p className="text-muted-foreground">{order.delivery_method === "pickup" ? "Buyer is picking it up" : "Delivery to buyer"}</p>
            {order.buyer_name && <p>{order.buyer_name}</p>}
            {order.buyer_phone && <p>{order.buyer_phone}</p>}
            {order.delivery_address && <p className="whitespace-pre-line text-muted-foreground">{order.delivery_address}</p>}
            {order.tracking_note && <p className="border-t pt-3 text-muted-foreground">Seller note: {order.tracking_note}</p>}
            {order.notes && <p className="border-t pt-3 text-muted-foreground">Buyer note: {order.notes}</p>}
          </aside>
        </div>
      </Page>

      <Modal open={shipOpen} onClose={() => setShipOpen(false)} title="Mark this order as sent">
        <Field label="Tracking or handover note (optional)" htmlFor="tracking">
          <textarea id="tracking" className="input min-h-[80px]" maxLength={300} value={trackingNote} onChange={(e) => setTrackingNote(e.target.value)} placeholder="Courier name, tracking number, pickup time…" />
        </Field>
        <button
          className="btn btn-primary mt-4 w-full"
          disabled={fulfil.isPending}
          onClick={() =>
            fulfil.mutate(
              { orderId: order.id, stage: "shipped", note: trackingNote },
              {
                onSuccess: () => {
                  toast.success("Buyer notified");
                  setShipOpen(false);
                },
                onError: (e) => toast.error(e.message),
              },
            )
          }
        >
          Confirm
        </button>
      </Modal>

      <Modal open={disputeOpen} onClose={() => setDisputeOpen(false)} title="Report a problem">
        <Field label="What went wrong?" htmlFor="reason">
          <select id="reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="item_not_received">I never received the item</option>
            <option value="not_as_described">It is not what was described</option>
            <option value="damaged">It arrived damaged</option>
            <option value="other">Something else</option>
          </select>
        </Field>
        <div className="mt-4" />
        <Field label="Tell us more" htmlFor="desc">
          <textarea id="desc" className="input min-h-[110px]" maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Explain what happened so we can help." />
        </Field>
        <button
          className="btn btn-danger mt-4 w-full"
          disabled={openDispute.isPending}
          onClick={() =>
            openDispute.mutate(
              { orderId: order.id, reason, description },
              {
                onSuccess: () => {
                  toast.success("Reported. The money stays held until this is sorted.");
                  setDisputeOpen(false);
                },
                onError: (e) => toast.error(e.message),
              },
            )
          }
        >
          Submit report
        </button>
      </Modal>
    </AppShell>
  );
}
