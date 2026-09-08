import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { Page, PageHeader } from "@/components/layout/PageLayout";
import { useAd } from "@/hooks/useAds";
import { useAuth } from "@/hooks/useAuth";
import { useCreateOrder, usePayForOrder } from "@/hooks/useCheckout";
import { useValidateCoupon, type CouponQuote } from "@/hooks/useCoupons";
import { Field } from "@/components/shared/Field";
import { Skeleton } from "@/components/shared/SkeletonLoader";
import { useToast } from "@/components/shared/Toast";
import { formatPrice } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/checkout/$adId")({
  head: () => ({ meta: [{ title: "Checkout — PlugZone" }, { name: "description", content: "Confirm your order details and pay securely into PlugZone escrow." }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { adId } = Route.useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: ad, isLoading } = useAd(adId);
  const create = useCreateOrder();
  const pay = usePayForOrder();

  const [quantity, setQuantityState] = useState(1);
  const [buyerName, setName] = useState(profile?.display_name ?? "");
  const [buyerPhone, setPhone] = useState(profile?.phone_number ?? "");
  const [notes, setNotes] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [quote, setQuote] = useState<CouponQuote | null>(null);
  const validate = useValidateCoupon();

  const busy = create.isPending || pay.isPending;
  const subtotal = ad ? Number(ad.price) * quantity : 0;
  const discount = quote?.discount ?? 0;
  const total = Math.max(0, subtotal - discount);

  // Changing the quantity changes the subtotal, so a previous quote no longer applies.
  const setQuantity = (q: number) => {
    setQuantityState(q);
    setQuote(null);
  };

  const applyCoupon = () => {
    if (!ad || !couponCode.trim()) return;
    validate.mutate(
      { code: couponCode, adId: ad.id, quantity },
      {
        onSuccess: (q) => {
          setQuote(q);
          toast.success(`${q.code} applied — you save ${formatPrice(q.discount, ad.currency)}`);
        },
        onError: (e) => {
          setQuote(null);
          toast.error(e.message);
        },
      },
    );
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ad) return;
    try {
      const orderId = await create.mutateAsync({
        adId: ad.id,
        quantity,
        deliveryMethod: "digital",
        deliveryAddress: "",
        buyerName,
        buyerPhone,
        notes,
        couponCode: quote ? quote.code : "",
      });
      await pay.mutateAsync(orderId);
      toast.success("Payment held in escrow. The seller has been notified.");
      navigate({ to: "/order/$orderId", params: { orderId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not complete checkout");
    }
  }

  if (isLoading) {
    return (
      <Page>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-6 h-64 w-full" />
      </Page>
    );
  }

  if (!ad || ad.status !== "active") {
    return (
      <Page>
        <PageHeader title="This listing isn't available" subtitle="It may have been sold, paused, or removed." />
        <Link to="/dashboard" className="btn btn-primary mt-6">
          Back to marketplace
        </Link>
      </Page>
    );
  }

  if (ad.seller_id === user?.id) {
    return (
      <Page>
        <PageHeader title="This is your own listing" subtitle="You cannot buy something you are selling." />
        <Link to="/ad/$adId" params={{ adId: ad.id }} className="btn btn-secondary mt-6">
          Back to the listing
        </Link>
      </Page>
    );
  }

  return (
    <Page className="pt-8">
      <PageHeader title="Checkout" subtitle="Everything is delivered online. Your money is held safely until you confirm you received it." />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <form className="panel space-y-5 p-5" onSubmit={submit}>
          <Field label="Quantity" htmlFor="qty">
            <input id="qty" type="number" min={1} max={99} className="input" value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name" htmlFor="name">
              <input id="name" className="input" value={buyerName} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
            </Field>
            <Field label="Email or phone (optional)" htmlFor="phone" hint="Leave blank and the seller will send it to you in chat.">
              <input id="phone" className="input" value={buyerPhone} onChange={(e) => setPhone(e.target.value)} placeholder="Where the seller sends your item" />
            </Field>
          </div>

          <Field label="Note to seller (optional)" htmlFor="notes">
            <textarea id="notes" className="input min-h-[80px]" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Account name, username, or anything the seller needs" />
          </Field>

          <Field label="Coupon code (optional)" htmlFor="coupon" hint={quote ? `${quote.code} applied — ${quote.label}.` : "Have a code from the seller or PlugZone? Enter it here."}>
            <div className="flex gap-2">
              <input
                id="coupon"
                className="input uppercase"
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value);
                  if (quote) setQuote(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyCoupon();
                  }
                }}
                placeholder="e.g. WELCOME10"
              />
              {quote ? (
                <button
                  type="button"
                  className="btn btn-secondary shrink-0"
                  onClick={() => {
                    setQuote(null);
                    setCouponCode("");
                  }}
                >
                  Remove
                </button>
              ) : (
                <button type="button" className="btn btn-secondary shrink-0" disabled={validate.isPending || !couponCode.trim()} onClick={applyCoupon}>
                  {validate.isPending ? "Checking…" : "Apply"}
                </button>
              )}
            </div>
          </Field>

          <button type="submit" className="btn btn-primary w-full" disabled={busy}>
            {busy ? "Processing…" : `Pay ${formatPrice(total, ad.currency)} into escrow`}
          </button>
          <p className="text-[13px] text-muted-foreground">
            Payments are running in test mode while we finish connecting a payment provider — no real money is charged yet.
          </p>
        </form>

        <aside className="panel h-fit p-5">
          <h2 className="text-lg">Order summary</h2>
          <div className="mt-4 flex gap-3 border-b pb-4">
            {ad.images[0] && <img src={ad.images[0]} alt="" className="h-16 w-16 rounded-md object-cover" loading="lazy" />}
            <div className="min-w-0">
              <p className="truncate font-medium">{ad.title}</p>
              <p className="text-[15px] text-muted-foreground">{formatPrice(ad.price, ad.currency)} each</p>
            </div>
          </div>
          <dl className="mt-4 space-y-2 text-[15px]">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Quantity</dt>
              <dd>{quantity}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatPrice(subtotal, ad.currency)}</dd>
            </div>
            {quote && (
              <div className="flex justify-between text-success">
                <dt>Coupon {quote.code}</dt>
                <dd>− {formatPrice(quote.discount, ad.currency)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t pt-3 font-heading text-lg font-bold">
              <dt>Total</dt>
              <dd>{formatPrice(total, ad.currency)}</dd>
            </div>
          </dl>
          <p className="mt-4 flex items-start gap-2 text-[13px] text-muted-foreground">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
            This is a digital item delivered online — by email, phone, or straight to your PlugZone chat. The seller is only paid after you confirm you received it.
          </p>
        </aside>
      </div>
    </Page>
  );
}
