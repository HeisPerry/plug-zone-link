import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Send, ShieldCheck } from "lucide-react";
import { Page, PageHeader } from "@/components/layout/PageLayout";
import { Field } from "@/components/shared/Field";
import { Skeleton } from "@/components/shared/SkeletonLoader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/Toast";
import { useAuth } from "@/hooks/useAuth";
import { useDispute, useDisputeMessages, useSendDisputeMessage } from "@/hooks/useDisputes";
import { useIsAdmin, useResolveDispute } from "@/hooks/useAdmin";
import { cn, formatDate, formatPrice } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dispute/$disputeId")({
  head: () => ({ meta: [{ title: "Reported problem — PlugZone" }, { name: "description", content: "Follow the conversation on a reported PlugZone order." }] }),
  component: DisputePage,
});

function DisputePage() {
  const { disputeId } = Route.useParams();
  const { user } = useAuth();
  const toast = useToast();
  const { data: dispute, isLoading } = useDispute(disputeId);
  const { data: messages } = useDisputeMessages(disputeId);
  const send = useSendDisputeMessage(disputeId);
  const { data: isAdmin } = useIsAdmin();
  const resolve = useResolveDispute();

  const [body, setBody] = useState("");
  const [resolution, setResolution] = useState("");

  if (isLoading) {
    return (
      <Page>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-6 h-72 w-full" />
      </Page>
    );
  }

  if (!dispute) {
    return (
      <Page>
        <PageHeader title="Report not found" subtitle="It may have been closed, or it isn't yours." />
        <Link to="/disputes" className="btn btn-primary mt-6">
          Back to reports
        </Link>
      </Page>
    );
  }

  const decide = (outcome: string, successText: string) =>
    resolve.mutate(
      { id: dispute.id, outcome, resolution },
      { onSuccess: () => toast.success(successText), onError: (e) => toast.error(e.message) },
    );

  return (
    <Page className="pt-8">
      <PageHeader
        title={dispute.ad_title}
        subtitle={`${dispute.order_number ?? "Order"} · ${formatPrice(dispute.total_price, dispute.currency)} · reported ${formatDate(dispute.created_at)}`}
        action={
          <Link to="/order/$orderId" params={{ orderId: dispute.order_id }} className="btn btn-secondary btn-sm">
            View order
          </Link>
        }
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="panel flex flex-col p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg">Conversation</h2>
            <StatusBadge status={dispute.status} />
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-lg bg-muted p-4 text-[15px]">
              <p className="font-medium capitalize">{dispute.reason.replace(/_/g, " ")}</p>
              <p className="mt-1 text-muted-foreground">{dispute.description}</p>
            </div>
            {(messages ?? []).map((m) => {
              const mine = m.author_id === user?.id;
              return (
                <div key={m.id} className={cn("max-w-[85%] rounded-lg px-4 py-3 text-[15px]", mine ? "ml-auto bg-primary-soft" : "bg-muted")}>
                  {m.is_admin && <p className="mb-1 text-[13px] font-semibold text-primary">PlugZone support</p>}
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">{formatDate(m.created_at)}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex gap-2">
            <input
              className="input flex-1"
              value={body}
              maxLength={1000}
              placeholder="Add more detail…"
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && body.trim()) {
                  send.mutate(body.trim(), { onSuccess: () => setBody(""), onError: (err) => toast.error(err.message) });
                }
              }}
            />
            <button
              className="btn btn-primary"
              disabled={!body.trim() || send.isPending}
              onClick={() => send.mutate(body.trim(), { onSuccess: () => setBody(""), onError: (err) => toast.error(err.message) })}
            >
              <Send size={16} aria-hidden="true" /> Send
            </button>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="panel space-y-2 p-5 text-[15px]">
            <h2 className="text-lg">Who is involved</h2>
            <p className="text-muted-foreground">Buyer: @{dispute.buyer.username}</p>
            <p className="text-muted-foreground">Seller: @{dispute.seller.username}</p>
            <p className="flex items-start gap-2 border-t pt-3 text-muted-foreground">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
              The money stays on hold until this is settled.
            </p>
            {dispute.resolution && <p className="border-t pt-3">Outcome: {dispute.resolution}</p>}
          </div>

          {isAdmin && dispute.status !== "resolved" && dispute.status !== "refunded" && (
            <div className="panel space-y-3 p-5">
              <h2 className="text-lg">Settle this case</h2>
              <Field label="Note for both sides" htmlFor="res">
                <textarea id="res" className="input min-h-[80px]" maxLength={600} value={resolution} onChange={(e) => setResolution(e.target.value)} />
              </Field>
              <button className="btn btn-primary w-full" disabled={resolve.isPending} onClick={() => decide("release_seller", "Money released to the seller")}>
                Release the money to the seller
              </button>
              <button className="btn btn-danger w-full" disabled={resolve.isPending} onClick={() => decide("refund_buyer", "Buyer refunded")}>
                Refund the buyer in full
              </button>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  max={Number(dispute.total_price)}
                  step="0.01"
                  className="input flex-1"
                  placeholder="Partial amount"
                  aria-label="Partial refund amount"
                  value={partial}
                  onChange={(e) => setPartial(e.target.value)}
                />
                <button
                  className="btn btn-secondary"
                  disabled={resolve.isPending || !(Number(partial) > 0)}
                  onClick={() =>
                    resolve.mutate(
                      { id: dispute.id, outcome: "partial_refund", resolution, amount: Number(partial) },
                      { onSuccess: () => toast.success("Split settled — buyer partly refunded, rest to seller"), onError: (e) => toast.error(e.message) },
                    )
                  }
                >
                  Split
                </button>
              </div>
              <button className="btn btn-secondary w-full" disabled={resolve.isPending} onClick={() => decide("under_review", "Marked as under review")}>
                Keep reviewing
              </button>
            </div>
          )}
        </aside>
      </div>
    </Page>
  );
}
