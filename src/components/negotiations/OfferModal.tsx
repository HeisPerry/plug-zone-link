import { useState } from "react";
import { Modal } from "@/components/shared/Modal";
import { Field } from "@/components/shared/Field";
import { offerSchema } from "@/lib/validators";
import { formatPrice } from "@/lib/utils";

export function OfferModal({
  open,
  onClose,
  title,
  listedPrice,
  currency,
  currentOffer,
  roundLabel,
  submitLabel,
  pending,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  listedPrice: number;
  currency: string;
  currentOffer?: number | undefined;
  roundLabel?: string | undefined;
  submitLabel: string;
  pending: boolean;
  onSubmit: (price: number, message: string) => void;
}) {
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<{ price?: string; message?: string }>({});

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = offerSchema.safeParse({ price, message });
    if (!parsed.success) {
      const errs: typeof errors = {};
      parsed.error.issues.forEach((i) => {
        const k = i.path[0] as keyof typeof errors;
        if (!errs[k]) errs[k] = i.message;
      });
      setErrors(errs);
      return;
    }
    if (currentOffer !== undefined && parsed.data.price === currentOffer) {
      setErrors({ price: "Enter a different amount from the current offer" });
      return;
    }
    if (currentOffer === undefined && parsed.data.price >= listedPrice) {
      setErrors({ price: "Your offer must be below the listed price" });
      return;
    }
    setErrors({});
    onSubmit(parsed.data.price, parsed.data.message ?? "");
  }

  const quick = currentOffer === undefined ? [0.95, 0.9, 0.85, 0.8].map((f) => Math.round((listedPrice * f) / 50) * 50).filter((v) => v > 0) : [];

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-[15px]">
          <div>
            <dt className="text-muted-foreground">Listed price</dt>
            <dd className="font-medium">{formatPrice(listedPrice, currency)}</dd>
          </div>
          {currentOffer !== undefined && (
            <div>
              <dt className="text-muted-foreground">Current offer</dt>
              <dd className="font-medium">{formatPrice(currentOffer, currency)}</dd>
            </div>
          )}
          {roundLabel && (
            <div>
              <dt className="text-muted-foreground">Round</dt>
              <dd className="font-medium">{roundLabel}</dd>
            </div>
          )}
        </dl>
        <Field label={`Your ${currentOffer !== undefined ? "counter-offer" : "offer"} (${currency})`} htmlFor="offer-price" error={errors.price}>
          <input id="offer-price" type="number" inputMode="decimal" min={1} step="0.01" className="input" value={price} onChange={(e) => setPrice(e.target.value)} autoFocus />
        </Field>
        {quick.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {quick.map((v) => (
              <button key={v} type="button" className="btn btn-secondary btn-sm" onClick={() => setPrice(String(v))}>
                {formatPrice(v, currency)}
              </button>
            ))}
          </div>
        )}
        <Field label="Note (optional)" htmlFor="offer-message" error={errors.message} counter={`${message.length}/300`}>
          <textarea id="offer-message" className="input min-h-[80px]" maxLength={300} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Why this price, or any conditions" />
        </Field>
        <p className="text-sm text-muted-foreground">Offers expire after 48 hours. Up to 5 rounds per listing.</p>
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? "Sending…" : submitLabel}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
