import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Tag } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isOpenOffer, useConversationNegotiations, useRespondToOffer } from "@/hooks/useNegotiations";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/Toast";
import { OfferModal } from "./OfferModal";
import { NEGOTIATION_MAX_ROUNDS } from "@/lib/constants";
import { cn, formatPrice, timeAgo } from "@/lib/utils";

/** Live offer tracker shown at the top of a message thread. */
export function OfferPanel({ conversationId }: { conversationId: string }) {
  const { user } = useAuth();
  const toast = useToast();
  const { data: negotiations } = useConversationNegotiations(conversationId);
  const respond = useRespondToOffer();
  const [counterId, setCounterId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  if (!negotiations?.length || !user) return null;

  const open = negotiations.filter(isOpenOffer);
  const closed = negotiations.filter((n) => !isOpenOffer(n));
  const visible = showAll ? negotiations : open.length ? open : closed.slice(0, 1);
  const countering = negotiations.find((n) => n.id === counterId);

  function act(id: string, action: "accept" | "decline" | "counter", price?: number, message?: string) {
    respond.mutate(
      { id, action, price, message },
      {
        onSuccess: () => {
          setCounterId(null);
          toast.success(action === "accept" ? "Offer accepted — order created" : action === "counter" ? "Counter-offer sent" : "Offer closed");
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <div className="border-b bg-muted/60 px-4 py-3 sm:px-6">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Tag size={15} className="text-primary" /> Offers
        </p>
        {closed.length > 0 && open.length > 0 && (
          <button type="button" className="text-sm font-medium text-primary" onClick={() => setShowAll((s) => !s)}>
            {showAll ? "Hide history" : `Show history (${closed.length})`}
          </button>
        )}
      </div>
      <ul className="mt-2 space-y-2">
        {visible.map((n) => {
          const isOpen = isOpenOffer(n);
          const status = isOpen ? n.status : n.status === "pending" || n.status === "countered" ? "expired" : n.status;
          const myTurn = isOpen && n.last_actor_id !== user.id;
          const iAmBuyer = n.buyer_id === user.id;
          const canCounter = myTurn && n.round_number < NEGOTIATION_MAX_ROUNDS;
          const currency = n.ad?.currency ?? "NGN";
          return (
            <li key={n.id} className="panel bg-background p-3">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                <div className="min-w-0">
                  {n.ad ? (
                    <Link to="/ad/$adId" params={{ adId: n.ad.id }} className="truncate text-[15px] font-medium hover:text-primary">
                      {n.ad.title}
                    </Link>
                  ) : (
                    <p className="text-[15px] font-medium">Listing removed</p>
                  )}
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                    <span className="line-through">{formatPrice(n.original_price, currency)}</span>
                    {n.previous_price !== null && n.previous_price !== n.original_price && (
                      <>
                        <ArrowRight size={12} />
                        <span className="line-through">{formatPrice(n.previous_price, currency)}</span>
                      </>
                    )}
                    <ArrowRight size={12} />
                    <span className={cn("font-heading text-base font-bold", status === "accepted" ? "text-success" : "text-foreground")}>{formatPrice(n.offered_price, currency)}</span>
                  </p>
                  {n.message && <p className="mt-1 text-sm text-muted-foreground">“{n.message}”</p>}
                </div>
                <div className="text-right text-sm">
                  <StatusBadge status={status} />
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Round {n.round_number}/{NEGOTIATION_MAX_ROUNDS} · {timeAgo(n.updated_at)}
                  </p>
                </div>
              </div>

              {isOpen && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {myTurn ? (
                    <>
                      <button className="btn btn-primary btn-sm" disabled={respond.isPending} onClick={() => act(n.id, "accept")}>
                        Accept {formatPrice(n.offered_price, currency)}
                      </button>
                      {canCounter && (
                        <button className="btn btn-secondary btn-sm" disabled={respond.isPending} onClick={() => setCounterId(n.id)}>
                          Counter-offer
                        </button>
                      )}
                      <button className="btn btn-ghost btn-sm" disabled={respond.isPending} onClick={() => act(n.id, "decline")}>
                        Decline
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm text-muted-foreground">Waiting for {iAmBuyer ? "the seller" : "the buyer"} · expires {timeAgo(n.expires_at).replace("in ", "in ")}</span>
                      <button className="btn btn-ghost btn-sm ml-auto" disabled={respond.isPending} onClick={() => act(n.id, "decline")}>
                        Withdraw
                      </button>
                    </>
                  )}
                  {!canCounter && myTurn && <span className="text-xs text-muted-foreground">Final round — accept or decline</span>}
                </div>
              )}
              {status === "accepted" && n.order_id && (
                <Link to="/orders" className="mt-2 inline-block text-sm font-medium text-primary">
                  View order
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      {countering && (
        <OfferModal
          open
          onClose={() => setCounterId(null)}
          title="Send a counter-offer"
          listedPrice={Number(countering.original_price)}
          currency={countering.ad?.currency ?? "NGN"}
          currentOffer={Number(countering.offered_price)}
          roundLabel={`${countering.round_number + 1} of ${NEGOTIATION_MAX_ROUNDS}`}
          submitLabel="Send Counter-offer"
          pending={respond.isPending}
          onSubmit={(price, message) => act(countering.id, "counter", price, message)}
        />
      )}
    </div>
  );
}
