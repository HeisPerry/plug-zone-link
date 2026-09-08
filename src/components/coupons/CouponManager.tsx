import { useState } from "react";
import { Plus, Ticket, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Field } from "@/components/shared/Field";
import { ListSkeleton } from "@/components/shared/SkeletonLoader";
import { Modal } from "@/components/shared/Modal";
import { useToast } from "@/components/shared/Toast";
import { useCreateCoupon, useDeleteCoupon, useSetCouponActive, type Coupon, type CouponInput } from "@/hooks/useCoupons";
import { useMyAds } from "@/hooks/useAds";
import { AD_CATEGORIES, CURRENCIES } from "@/lib/constants";
import { cn, formatDate, formatPrice } from "@/lib/utils";

type Mode = "seller" | "admin";

export function CouponManager({ mode, coupons, isLoading }: { mode: Mode; coupons: Coupon[] | undefined; isLoading: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] text-muted-foreground">
          {mode === "seller" ? "Buyers type a code at checkout and the discount comes off your item price." : "Platform-wide codes work on any seller's listing. Seller codes are listed here too."}
        </p>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>
          <Plus size={16} aria-hidden="true" /> Create a coupon
        </button>
      </div>

      <div className="mt-5">
        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : !coupons?.length ? (
          <EmptyState title="No coupons yet" body="Create a code to give buyers a percentage or fixed-amount discount." />
        ) : (
          <ul className="divide-y rounded-lg border">
            {coupons.map((c) => (
              <CouponRow key={c.id} coupon={c} showScope={mode === "admin"} />
            ))}
          </ul>
        )}
      </div>

      <CouponFormModal open={open} onClose={() => setOpen(false)} mode={mode} />
    </div>
  );
}

function CouponRow({ coupon: c, showScope }: { coupon: Coupon; showScope: boolean }) {
  const toast = useToast();
  const setActive = useSetCouponActive();
  const remove = useDeleteCoupon();
  const expired = !!c.expires_at && new Date(c.expires_at) < new Date();
  const exhausted = c.max_uses != null && c.used_count >= c.max_uses;
  const state = !c.is_active ? "Paused" : expired ? "Expired" : exhausted ? "Fully used" : "Live";
  const amount = c.discount_type === "percent" ? `${Number(c.discount_value)}% off` : `${formatPrice(c.discount_value, c.currency ?? "NGN")} off`;

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="icon-tile h-8 w-8 rounded-lg">
            <Ticket size={15} />
          </span>
          <p className="font-heading text-[17px] font-bold tracking-wide">{c.code}</p>
          <span className={cn("pill text-xs", state !== "Live" && "pill-muted")}>{state}</span>
          {showScope && <span className="pill pill-muted text-xs">{c.scope === "platform" ? "Platform-wide" : "Seller"}</span>}
        </div>
        <p className="mt-1 text-[14px] text-muted-foreground">
          {amount}
          {c.max_discount != null && ` · up to ${formatPrice(c.max_discount, c.currency ?? "NGN")}`}
          {Number(c.min_order_value) > 0 && ` · min order ${formatPrice(c.min_order_value, c.currency ?? "NGN")}`}
          {c.category && ` · ${c.category}`}
          {c.ad_id && " · one listing only"}
          {c.first_order_only && " · first order only"}
          {c.expires_at ? ` · ends ${formatDate(c.expires_at)}` : " · no expiry"}
          {` · used ${c.used_count}${c.max_uses != null ? `/${c.max_uses}` : ""}`}
        </p>
        {c.description && <p className="mt-1 text-[14px]">{c.description}</p>}
      </div>
      <div className="flex gap-2">
        <button
          className="btn btn-secondary"
          disabled={setActive.isPending}
          onClick={() => setActive.mutate({ id: c.id, is_active: !c.is_active }, { onError: (e) => toast.error(e.message) })}
        >
          {c.is_active ? "Pause" : "Resume"}
        </button>
        <button
          className="btn btn-ghost text-destructive"
          aria-label={`Delete ${c.code}`}
          disabled={remove.isPending}
          onClick={() => {
            if (confirm(`Delete coupon ${c.code}? Buyers will no longer be able to use it.`)) remove.mutate(c.id, { onError: (e) => toast.error(e.message) });
          }}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </li>
  );
}

function CouponFormModal({ open, onClose, mode }: { open: boolean; onClose: () => void; mode: Mode }) {
  const toast = useToast();
  const create = useCreateCoupon();
  const { data: myAds } = useMyAds({ status: "active", search: "", page: 0 });

  const [code, setCode] = useState("");
  const [scope, setScope] = useState<"seller" | "platform">(mode === "admin" ? "platform" : "seller");
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState("10");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [minOrder, setMinOrder] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [perUser, setPerUser] = useState("1");
  const [adId, setAdId] = useState("");
  const [category, setCategory] = useState("");
  const [firstOnly, setFirstOnly] = useState(false);
  const [expires, setExpires] = useState("");
  const [description, setDescription] = useState("");

  const num = (s: string) => (s.trim() === "" ? null : Number(s));

  const submit = () => {
    const v = Number(value);
    if (!code.trim()) return toast.error("Give the coupon a code");
    if (!v || v <= 0) return toast.error("Enter a discount amount");
    if (type === "percent" && v > 100) return toast.error("A percentage can't be more than 100");
    const input: CouponInput = {
      code: code.trim(),
      scope,
      discount_type: type,
      discount_value: v,
      max_discount: type === "percent" ? num(maxDiscount) : null,
      currency: type === "fixed" || maxDiscount || minOrder ? currency : null,
      min_order_value: num(minOrder) ?? 0,
      max_uses: num(maxUses),
      per_user_limit: num(perUser),
      ad_id: scope === "seller" && adId ? adId : null,
      category: category || null,
      first_order_only: firstOnly,
      expires_at: expires ? new Date(expires).toISOString() : null,
      description: description.trim() || null,
    };
    create.mutate(input, {
      onSuccess: () => {
        toast.success(`Coupon ${input.code.toUpperCase()} is live`);
        setCode("");
        onClose();
      },
      onError: (e) => toast.error(e.message.includes("coupons_code_key") ? "That code is already taken" : e.message),
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Create a coupon">
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <Field label="Code" htmlFor="cp-code" hint="Letters and numbers, 3–24 characters. Buyers type this at checkout.">
          <input id="cp-code" className="input uppercase" maxLength={24} value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. WELCOME10" />
        </Field>

        {mode === "admin" && (
          <Field label="Applies to" htmlFor="cp-scope">
            <select id="cp-scope" className="input" value={scope} onChange={(e) => setScope(e.target.value as "seller" | "platform")}>
              <option value="platform">Every listing on PlugZone</option>
              <option value="seller">Only my own listings</option>
            </select>
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Discount type" htmlFor="cp-type">
            <select id="cp-type" className="input" value={type} onChange={(e) => setType(e.target.value as "percent" | "fixed")}>
              <option value="percent">Percentage off</option>
              <option value="fixed">Fixed amount off</option>
            </select>
          </Field>
          <Field label={type === "percent" ? "Percent off" : "Amount off"} htmlFor="cp-value">
            <input id="cp-value" type="number" min={0.01} step="0.01" className="input" value={value} onChange={(e) => setValue(e.target.value)} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Currency" htmlFor="cp-cur" hint={type === "percent" ? "Only needed if you set a cap or a minimum." : "Only listings in this currency qualify."}>
            <select id="cp-cur" className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          {type === "percent" ? (
            <Field label="Cap the discount at (optional)" htmlFor="cp-max">
              <input id="cp-max" type="number" min={0} className="input" value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value)} placeholder="No cap" />
            </Field>
          ) : (
            <div />
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Minimum order (optional)" htmlFor="cp-min">
            <input id="cp-min" type="number" min={0} className="input" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} placeholder="0" />
          </Field>
          <Field label="Total uses (optional)" htmlFor="cp-uses">
            <input id="cp-uses" type="number" min={1} className="input" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="Unlimited" />
          </Field>
          <Field label="Uses per buyer" htmlFor="cp-per">
            <input id="cp-per" type="number" min={1} className="input" value={perUser} onChange={(e) => setPerUser(e.target.value)} placeholder="Unlimited" />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Limit to a category (optional)" htmlFor="cp-cat">
            <select id="cp-cat" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Any category</option>
              {AD_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          {scope === "seller" && (
            <Field label="Limit to one listing (optional)" htmlFor="cp-ad">
              <select id="cp-ad" className="input" value={adId} onChange={(e) => setAdId(e.target.value)}>
                <option value="">Any of my listings</option>
                {(myAds?.ads ?? []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>

        <Field label="Ends on (optional)" htmlFor="cp-exp">
          <input id="cp-exp" type="datetime-local" className="input" value={expires} onChange={(e) => setExpires(e.target.value)} />
        </Field>

        <label className="flex items-center gap-3 text-[15px]">
          <input type="checkbox" className="h-4 w-4 accent-primary" checked={firstOnly} onChange={(e) => setFirstOnly(e.target.checked)} />
          Only for a buyer's first paid order
        </label>

        <Field label="Note (optional)" htmlFor="cp-desc">
          <input id="cp-desc" className="input" maxLength={120} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Launch week promo" />
        </Field>

        <button className="btn btn-primary w-full" disabled={create.isPending} onClick={submit}>
          {create.isPending ? "Creating…" : "Create coupon"}
        </button>
      </div>
    </Modal>
  );
}
