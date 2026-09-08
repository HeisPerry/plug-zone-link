import { useState } from "react";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { ShieldCheck, Truck, PackageCheck, AlertTriangle, MessageCircle, RotateCcw, XCircle, Clock } from "lucide-react";
import { useStartConversation } from "@/hooks/useMessages";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, Page, PageHeader } from "@/components/layout/PageLayout";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useAdmin";
import {
  useOrder,
  useOrderEvents,
  useOrderDispute,
  useSetFulfilment,
  useConfirmReceipt,
  useOpenDispute,
  usePayForOrder,
  useAcceptOrder,
  useCancelOrder,
  useRequestRefund,
  useWithdrawRefundRequest,
  useRespondRefund,
  useAdminSettleOrder,
  useEscrowLedger,
} from "@/hooks/useCheckout";
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
  partially_refunded: "Partly refunded — rest paid to seller",
  disputed: "Frozen — under review",
};

const LEDGER_LABEL: Record<string, string> = {
  hold: "Payment held in escrow",
  release: "Released to seller",
  auto_release: "Released to seller automatically",
  dispute_release: "Released to seller after review",
  admin_release: "Released to seller by PlugZone team",
  refund: "Refunded to buyer",
  partial_refund: "Partial refund to buyer",
  dispute_hold: "Frozen while a report is reviewed",
  refund_requested: "Refund requested by buyer",
  refund_declined: "Refund request declined by seller",
  refund_request_withdrawn: "Refund request withdrawn",
};

function OrderDetailPage() {
  const { orderId } = Route.useParams();
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const toast = useToast();
  const navigate = useNavigate();
  const startChat = useStartConversation();
  const { data: order, isLoading } = useOrder(orderId);
  const { data: events } = useOrderEvents(orderId);
  const { data: ledger } = useEscrowLedger(orderId);
  const { data: dispute } = useOrderDispute(orderId);
  const pay = usePayForOrder();
  const fulfil = useSetFulfilment();
  const confirm = useConfirmReceipt();
  const openDispute = useOpenDispute();
  const accept = useAcceptOrder();
  const cancel = useCancelOrder();
  const requestRefund = useRequestRefund();
  const withdrawRefund = useWithdrawRefundRequest();
  const respondRefund = useRespondRefund();
  const adminSettle = useAdminSettleOrder();

  const [shipOpen, setShipOpen] = useState(false);
  const [trackingNote, setTrackingNote] = useState("");
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [reason, setReason] = useState("item_not_received");
  const [description, setDescription] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [respondOpen, setRespondOpen] = useState(false);
  const [respondAmount, setRespondAmount] = useState("");
  const [respondNote, setRespondNote] = useState("");
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminAmount, setAdminAmount] = useState("");
  const [adminNote, setAdminNote] = useState("");

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
  const isSeller = order.seller_id === user?.id;
  const other = isBuyer ? order.seller : order.buyer;
  const escrow = order.escrow_status ?? "none";
  const cur = order.ad.currency;
  const total = Number(order.total_price);
  const refundOpenOnOrder = !!order.refund_requested_at;
  const canCancel = (order.status === "pending" || order.status === "accepted") && escrow !== "disputed";
  const ok = (msg: string) => ({ onSuccess: () => toast.success(msg), onError: (e: Error) => toast.error(e.message) });

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
                      {order.quantity} × · {formatPrice(order.total_price, cur)}
                      {Number(order.discount_amount) > 0 && (
                        <span className="ml-2 text-success">(coupon saved {formatPrice(order.discount_amount, cur)})</span>
                      )}
                    </p>
                  </div>
                </div>
                <StatusBadge status={order.status} />
              </div>

              <p className="mt-5 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-[15px]">
                <ShieldCheck size={16} className="text-primary" aria-hidden="true" />
                {ESCROW_LABEL[escrow] ?? escrow}
                {Number(order.refunded_amount) > 0 && <span className="text-muted-foreground">· {formatPrice(order.refunded_amount, cur)} refunded</span>}
              </p>

              {escrow === "held" && !refundOpenOnOrder && (
                <p className="mt-3 flex items-center gap-2 text-[14px] text-muted-foreground">
                  <Clock size={15} aria-hidden="true" />
                  {isBuyer
                    ? "The money stays on hold until you confirm you received the item. It is never released automatically."
                    : "The money stays on hold until the buyer confirms receipt. If the buyer goes quiet, report a problem and the PlugZone team will step in."}
                </p>
              )}

              {refundOpenOnOrder && (
                <div className="mt-4 rounded-lg border border-warning/40 bg-warning/5 p-4 text-[15px]">
                  <p className="font-medium">Refund requested · {formatPrice(order.refund_requested_amount ?? total, cur)}</p>
                  <p className="mt-1 text-muted-foreground">{order.refund_reason}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {isSeller && (
                      <>
                        <button className="btn btn-primary btn-sm" onClick={() => { setRespondAmount(String(order.refund_requested_amount ?? total)); setRespondOpen(true); }}>
                          Approve refund
                        </button>
                        <button className="btn btn-secondary btn-sm" disabled={respondRefund.isPending} onClick={() => respondRefund.mutate({ orderId: order.id, action: "decline" }, ok("Refund request declined"))}>
                          Decline
                        </button>
                      </>
                    )}
                    {isBuyer && (
                      <button className="btn btn-ghost btn-sm" disabled={withdrawRefund.isPending} onClick={() => withdrawRefund.mutate(order.id, ok("Request withdrawn"))}>
                        Withdraw request
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                {isBuyer && order.payment_status !== "paid" && order.status !== "cancelled" && (
                  <button className="btn btn-primary" disabled={pay.isPending} onClick={() => pay.mutate(order.id, ok("Payment held in escrow"))}>
                    {pay.isPending ? "Processing…" : "Pay now"}
                  </button>
                )}
                {isSeller && order.status === "pending" && (
                  <button className="btn btn-secondary" disabled={accept.isPending} onClick={() => accept.mutate(order.id, ok("Order accepted"))}>
                    Accept order
                  </button>
                )}
                {isSeller && escrow === "held" && order.status !== "shipped" && order.status !== "delivered" && (
                  <button className="btn btn-primary" onClick={() => setShipOpen(true)}>
                    <Truck size={16} aria-hidden="true" /> Send item to buyer
                  </button>
                )}
                {isSeller && order.status === "shipped" && (
                  <button className="btn btn-secondary" onClick={() => fulfil.mutate({ orderId: order.id, stage: "delivered" }, ok("Marked delivered"))}>
                    <PackageCheck size={16} aria-hidden="true" /> Mark as delivered
                  </button>
                )}
                {isBuyer && escrow === "held" && !refundOpenOnOrder && (
                  <button className="btn btn-primary" disabled={confirm.isPending} onClick={() => confirm.mutate(order.id, ok("Thanks — the seller has been paid"))}>
                    Confirm I received it
                  </button>
                )}
                <button
                  className="btn btn-secondary"
                  disabled={startChat.isPending}
                  onClick={() =>
                    startChat.mutate(other.id, {
                      onSuccess: (conversationId) => navigate({ to: "/messages", search: { c: conversationId } }),
                      onError: (e) => toast.error(e.message),
                    })
                  }
                >
                  <MessageCircle size={16} aria-hidden="true" /> {isBuyer ? "Message seller" : "Deliver in chat"}
                </button>
                {isBuyer && escrow === "held" && !refundOpenOnOrder && order.status !== "accepted" && (
                  <button className="btn btn-ghost" onClick={() => { setRefundAmount(String(total)); setRefundOpen(true); }}>
                    <RotateCcw size={16} aria-hidden="true" /> Request a refund
                  </button>
                )}
                {(isBuyer || isSeller) && canCancel && (
                  <button className="btn btn-ghost" onClick={() => setCancelOpen(true)}>
                    <XCircle size={16} aria-hidden="true" /> Cancel order
                  </button>
                )}
                {!dispute && (escrow === "held" || order.status === "delivered") && (
                  <button className="btn btn-ghost" onClick={() => setDisputeOpen(true)}>
                    <AlertTriangle size={16} aria-hidden="true" /> Report a problem
                  </button>
                )}
                {isAdmin && (escrow === "held" || escrow === "disputed") && (
                  <button className="btn btn-ghost" onClick={() => { setAdminAmount(String(total)); setAdminOpen(true); }}>
                    <ShieldCheck size={16} aria-hidden="true" /> Admin: settle
                  </button>
                )}
              </div>

              {order.status === "cancelled" && order.cancel_reason && (
                <p className="mt-4 text-[14px] text-muted-foreground">Cancelled{order.cancelled_by === order.seller_id ? " by seller" : " by buyer"}: {order.cancel_reason}</p>
              )}

              {dispute && (
                <div className="mt-5 rounded-lg border border-destructive/30 p-4">
                  <p className="font-medium text-destructive">A problem was reported</p>
                  <p className="mt-1 text-[15px] text-muted-foreground">{dispute.description}</p>
                  <p className="mt-2 text-[13px] text-muted-foreground">Status: {dispute.status.replace(/_/g, " ")}</p>
                  <Link to="/dispute/$disputeId" params={{ disputeId: dispute.id }} className="btn btn-secondary btn-sm mt-3">
                    Open the report
                  </Link>
                </div>
              )}
            </section>

            <section className="panel p-5">
              <h2 className="text-lg">Money trail</h2>
              <ol className="mt-4 space-y-3">
                {(ledger ?? []).map((e) => (
                  <li key={e.id} className="flex items-start justify-between gap-3 text-[15px]">
                    <span>
                      <span>{LEDGER_LABEL[e.entry_type] ?? e.entry_type.replace(/_/g, " ")}</span>
                      {e.note && <span className="block text-[13px] text-muted-foreground">{e.note}</span>}
                      <span className="block text-[13px] text-muted-foreground">{formatDate(e.created_at)}</span>
                    </span>
                    {Number(e.amount) > 0 && <span className="shrink-0 font-medium">{formatPrice(e.amount, e.currency)}</span>}
                  </li>
                ))}
                {!ledger?.length && <li className="text-[15px] text-muted-foreground">No money has moved on this order yet.</li>}
              </ol>
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
            <p className="text-muted-foreground">Digital item — sent online or in PlugZone chat</p>
            {order.buyer_name && <p>{order.buyer_name}</p>}
            {order.buyer_phone && <p>{order.buyer_phone}</p>}
            {order.tracking_note && <p className="border-t pt-3 text-muted-foreground">Delivery note: {order.tracking_note}</p>}
            {order.notes && <p className="border-t pt-3 text-muted-foreground">Buyer note: {order.notes}</p>}
          </aside>
        </div>
      </Page>

      <Modal open={shipOpen} onClose={() => setShipOpen(false)} title="Send this digital item">
        <Field label="Delivery note or link (optional)" htmlFor="tracking">
          <textarea id="tracking" className="input min-h-[80px]" maxLength={300} value={trackingNote} onChange={(e) => setTrackingNote(e.target.value)} placeholder="Download link, access code, or where you sent it" />
        </Field>
        <button
          className="btn btn-primary mt-4 w-full"
          disabled={fulfil.isPending}
          onClick={() => fulfil.mutate({ orderId: order.id, stage: "shipped", note: trackingNote }, { onSuccess: () => { toast.success("Buyer notified"); setShipOpen(false); }, onError: (e) => toast.error(e.message) })}
        >
          Confirm
        </button>
      </Modal>

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel this order">
        <p className="text-[15px] text-muted-foreground">{escrow === "held" ? "The full payment goes straight back to the buyer." : "No money has moved, so nothing needs refunding."}</p>
        <div className="mt-4" />
        <Field label="Reason (optional)" htmlFor="cancel-reason">
          <input id="cancel-reason" className="input" maxLength={200} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Let the other side know why" />
        </Field>
        <button
          className="btn btn-danger mt-4 w-full"
          disabled={cancel.isPending}
          onClick={() => cancel.mutate({ orderId: order.id, reason: cancelReason }, { onSuccess: () => { toast.success("Order cancelled"); setCancelOpen(false); }, onError: (e) => toast.error(e.message) })}
        >
          Cancel order
        </button>
      </Modal>

      <Modal open={refundOpen} onClose={() => setRefundOpen(false)} title="Request a refund">
        <Field label={`Amount (up to ${formatPrice(total, cur)})`} htmlFor="refund-amount">
          <input id="refund-amount" type="number" min={1} max={total} step="0.01" className="input" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
        </Field>
        <div className="mt-4" />
        <Field label="Why do you want a refund?" htmlFor="refund-reason">
          <textarea id="refund-reason" className="input min-h-[90px]" maxLength={500} value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="The seller sees this and can approve or decline" />
        </Field>
        <button
          className="btn btn-primary mt-4 w-full"
          disabled={requestRefund.isPending}
          onClick={() =>
            requestRefund.mutate(
              { orderId: order.id, reason: refundReason, amount: Number(refundAmount) || undefined },
              { onSuccess: () => { toast.success("Refund requested — the seller has been notified"); setRefundOpen(false); setRefundReason(""); }, onError: (e) => toast.error(e.message) },
            )
          }
        >
          Send request
        </button>
      </Modal>

      <Modal open={respondOpen} onClose={() => setRespondOpen(false)} title="Approve refund">
        <Field label={`Refund amount (up to ${formatPrice(total, cur)})`} htmlFor="respond-amount" hint="Refund less than the total and the rest is paid to you now.">
          <input id="respond-amount" type="number" min={1} max={total} step="0.01" className="input" value={respondAmount} onChange={(e) => setRespondAmount(e.target.value)} />
        </Field>
        <div className="mt-4" />
        <Field label="Note to buyer (optional)" htmlFor="respond-note">
          <input id="respond-note" className="input" maxLength={200} value={respondNote} onChange={(e) => setRespondNote(e.target.value)} />
        </Field>
        <button
          className="btn btn-primary mt-4 w-full"
          disabled={respondRefund.isPending}
          onClick={() =>
            respondRefund.mutate(
              { orderId: order.id, action: "approve", amount: Number(respondAmount) || undefined, note: respondNote },
              { onSuccess: () => { toast.success("Refund sent to buyer"); setRespondOpen(false); }, onError: (e) => toast.error(e.message) },
            )
          }
        >
          Refund {Number(respondAmount) ? formatPrice(Number(respondAmount), cur) : ""}
        </button>
      </Modal>

      <Modal open={adminOpen} onClose={() => setAdminOpen(false)} title="Settle this order">
        <Field label="Refund amount to buyer" htmlFor="admin-amount" hint="Anything left over is released to the seller.">
          <input id="admin-amount" type="number" min={0} max={total} step="0.01" className="input" value={adminAmount} onChange={(e) => setAdminAmount(e.target.value)} />
        </Field>
        <div className="mt-4" />
        <Field label="Note (optional)" htmlFor="admin-note">
          <input id="admin-note" className="input" maxLength={200} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
        </Field>
        <div className="mt-4 flex gap-2">
          <button
            className="btn btn-danger flex-1"
            disabled={adminSettle.isPending || !(Number(adminAmount) > 0)}
            onClick={() => adminSettle.mutate({ orderId: order.id, action: "refund", amount: Number(adminAmount), note: adminNote }, { onSuccess: () => { toast.success("Refund issued"); setAdminOpen(false); }, onError: (e) => toast.error(e.message) })}
          >
            Refund buyer
          </button>
          <button
            className="btn btn-primary flex-1"
            disabled={adminSettle.isPending}
            onClick={() => adminSettle.mutate({ orderId: order.id, action: "release", note: adminNote }, { onSuccess: () => { toast.success("Released to seller"); setAdminOpen(false); }, onError: (e) => toast.error(e.message) })}
          >
            Release all to seller
          </button>
        </div>
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
          onClick={() => openDispute.mutate({ orderId: order.id, reason, description }, { onSuccess: () => { toast.success("Reported. The money stays held until this is sorted."); setDisputeOpen(false); }, onError: (e) => toast.error(e.message) })}
        >
          Submit report
        </button>
      </Modal>
    </AppShell>
  );
}
