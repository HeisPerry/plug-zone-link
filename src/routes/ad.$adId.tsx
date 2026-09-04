import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { useAd, useUpdateAdStatus } from "@/hooks/useAds";
import { useAuth } from "@/hooks/useAuth";
import { usePlaceOrder } from "@/hooks/useOrders";
import { useStartConversation } from "@/hooks/useMessages";
import { PublicHeader } from "@/components/layout/PageLayout";
import { CategoryBadge, StatusBadge } from "@/components/shared/StatusBadge";
import { Skeleton } from "@/components/shared/SkeletonLoader";
import { Modal } from "@/components/shared/Modal";
import { Field } from "@/components/shared/Field";
import { useToast } from "@/components/shared/Toast";
import { Avatar } from "@/components/shared/Avatar";
import { cn, formatDate, formatPrice } from "@/lib/utils";

export const Route = createFileRoute("/ad/$adId")({
  head: () => ({
    meta: [
      { title: "Ad details — PlugZone" },
      { name: "description", content: "View this listing on PlugZone, message the seller, or place an order directly." },
      { property: "og:title", content: "Ad details — PlugZone" },
      { property: "og:description", content: "View this listing, message the seller, or place an order." },
    ],
  }),
  component: AdDetailPage,
});

function AdDetailPage() {
  const { adId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: ad, isLoading } = useAd(adId);
  const [active, setActive] = useState(0);
  const [ordering, setOrdering] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const place = usePlaceOrder();
  const start = useStartConversation();
  const update = useUpdateAdStatus();

  const isOwner = !!user && ad?.seller_id === user.id;
  const headerRight = user ? (
    <Link to="/dashboard" className="btn btn-secondary btn-sm">
      Dashboard
    </Link>
  ) : (
    <div className="flex gap-2">
      <Link to="/login" className="btn btn-ghost btn-sm">
        Sign in
      </Link>
      <Link to="/signup" className="btn btn-primary btn-sm">
        Create Account
      </Link>
    </div>
  );

  function requireAuth(fn: () => void) {
    if (!user) return navigate({ to: "/login" });
    fn();
  }

  return (
    <div className="min-h-screen">
      <PublicHeader right={headerRight} />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        {isLoading ? (
          <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
            <Skeleton className="aspect-[4/3] w-full" />
            <div className="space-y-4">
              <Skeleton className="h-9 w-3/4" />
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        ) : !ad ? (
          <div className="py-20">
            <h1 className="text-2xl">This ad isn't available</h1>
            <p className="mt-2 text-[15px] text-muted-foreground">It may have been sold, paused, or removed by the seller.</p>
            <Link to="/" className="btn btn-secondary mt-6">
              Back to homepage
            </Link>
          </div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
            <section>
              {ad.images.length ? (
                <>
                  <img src={ad.images[active]} alt={ad.title} className="aspect-[4/3] w-full rounded-lg border object-cover" />
                  {ad.images.length > 1 && (
                    <div className="mt-3 flex gap-2 overflow-x-auto hide-scrollbar">
                      {ad.images.map((src, i) => (
                        <button
                          key={src}
                          onClick={() => setActive(i)}
                          className={cn("h-16 w-16 shrink-0 overflow-hidden rounded-md border", i === active && "border-primary ring-1 ring-primary")}
                          aria-label={`Photo ${i + 1}`}
                        >
                          <img src={src} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center rounded-lg border bg-muted text-[15px] text-muted-foreground">No photos for this ad</div>
              )}
            </section>

            <section>
              <div className="flex flex-wrap items-center gap-2">
                <CategoryBadge>{ad.category}</CategoryBadge>
                {ad.status !== "active" && <StatusBadge status={ad.status} />}
              </div>
              <h1 className="mt-3 text-[28px] sm:text-[34px]">{ad.title}</h1>
              <p className="mt-3 font-heading text-3xl font-bold text-primary">{formatPrice(ad.price, ad.currency)}</p>

              <div className="mt-6 flex items-center gap-3 border-y py-4">
                <Avatar name={ad.seller.display_name} username={ad.seller.username} src={ad.seller.avatar_url} size={40} />
                <div className="min-w-0">
                  <Link to="/user/$username" params={{ username: ad.seller.username }} className="font-medium hover:text-primary">
                    {ad.seller.display_name}
                  </Link>
                  <p className="text-sm text-muted-foreground">@{ad.seller.username}</p>
                </div>
              </div>

              <dl className="mt-4 space-y-1.5 text-[15px] text-muted-foreground">
                {ad.location && (
                  <div className="flex items-center gap-2">
                    <MapPin size={16} /> {ad.location}
                  </div>
                )}
                <div>Posted {formatDate(ad.created_at)}</div>
              </dl>

              <div className="mt-6 flex flex-wrap gap-2">
                {isOwner ? (
                  <>
                    <Link to="/ads/$adId/edit" params={{ adId: ad.id }} className="btn btn-primary">
                      Edit Ad
                    </Link>
                    <button className="btn btn-secondary" onClick={() => setConfirmDelete(true)}>
                      Delete Ad
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-primary" disabled={ad.status !== "active"} onClick={() => requireAuth(() => setOrdering(true))}>
                      Place Order
                    </button>
                    <button
                      className="btn btn-secondary"
                      disabled={start.isPending}
                      onClick={() =>
                        requireAuth(() =>
                          start.mutate(ad.seller_id, {
                            onSuccess: (cid) => navigate({ to: "/messages", search: { c: cid } }),
                            onError: (e) => toast.error(e.message),
                          }),
                        )
                      }
                    >
                      Message Seller
                    </button>
                  </>
                )}
              </div>

              <h2 className="mt-10 text-lg">Description</h2>
              <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed">{ad.description}</p>
            </section>
          </div>
        )}
      </div>

      <Modal open={ordering} onClose={() => setOrdering(false)} title="Place order">
        {ad && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              place.mutate(
                { adId: ad.id, sellerId: ad.seller_id, quantity: qty, unitPrice: Number(ad.price), notes },
                {
                  onSuccess: () => {
                    toast.success("Order placed");
                    setOrdering(false);
                    navigate({ to: "/orders" });
                  },
                  onError: (err) => toast.error(err.message),
                },
              );
            }}
          >
            <p className="text-[15px] text-muted-foreground">{ad.title}</p>
            <Field label="Quantity" htmlFor="qty">
              <input id="qty" type="number" min={1} max={99} className="input" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} />
            </Field>
            <Field label="Note to seller (optional)" htmlFor="notes">
              <textarea id="notes" className="input min-h-[90px]" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery address, preferred time…" />
            </Field>
            <div className="flex items-center justify-between border-t pt-4">
              <span className="text-[15px] text-muted-foreground">Total</span>
              <span className="font-heading text-xl font-bold">{formatPrice(Number(ad.price) * qty, ad.currency)}</span>
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={place.isPending}>
              {place.isPending ? "Placing order…" : "Confirm Order"}
            </button>
          </form>
        )}
      </Modal>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this ad?">
        <p className="text-[15px] text-muted-foreground">This removes the ad from the marketplace permanently.</p>
        <div className="mt-6 flex gap-2">
          <button
            className="btn btn-danger"
            onClick={() =>
              ad &&
              update.mutate(
                { id: ad.id, status: "deleted" },
                {
                  onSuccess: () => {
                    toast.success("Ad deleted");
                    navigate({ to: "/ads" });
                  },
                },
              )
            }
          >
            Delete Ad
          </button>
          <button className="btn btn-secondary" onClick={() => setConfirmDelete(false)}>
            Keep it
          </button>
        </div>
      </Modal>
    </div>
  );
}
