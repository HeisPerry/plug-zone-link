import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Page, PageHeader } from "@/components/layout/PageLayout";
import { useAuth } from "@/hooks/useAuth";
import { useDataAirtimeOrders, usePlaceDataAirtimeOrder } from "@/hooks/useDataAirtime";
import { DATA_PLANS, PROVIDERS, type DataPlan, type Provider } from "@/lib/constants";
import { airtimeAmount, nigerianPhone } from "@/lib/validators";
import { Field } from "@/components/shared/Field";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/Toast";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import type { DataAirtimeOrder } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/data-airtime")({
  head: () => ({ meta: [{ title: "Buy Data & Airtime — PlugZone" }] }),
  component: DataAirtimePage,
});

const PROVIDER_ACCENT: Record<Provider, string> = {
  MTN: "bg-mtn",
  Airtel: "bg-airtel",
  Glo: "bg-glo",
  "9mobile": "bg-ninemobile",
};

function DataAirtimePage() {
  const [tab, setTab] = useState<"data" | "airtime">("data");
  const [done, setDone] = useState<DataAirtimeOrder | null>(null);
  const history = useDataAirtimeOrders();

  return (
    <Page>
      <PageHeader title="Buy Data & Airtime" subtitle="Instant top-ups for all four Nigerian networks." />
      {done ? (
        <Confirmation order={done} onReset={() => setDone(null)} />
      ) : (
        <>
          <div className="mt-6 flex border-b">
            <button className="tab" data-active={tab === "data"} onClick={() => setTab("data")}>
              Buy Data
            </button>
            <button className="tab" data-active={tab === "airtime"} onClick={() => setTab("airtime")}>
              Buy Airtime
            </button>
          </div>
          <div className="mt-6">
            <PurchaseFlow key={tab} type={tab} onDone={setDone} />
          </div>
        </>
      )}

      {history.data && history.data.length > 0 && (
        <section className="mt-14">
          <h2 className="text-lg">Recent top-ups</h2>
          <ul className="mt-3 divide-y border-y">
            {history.data.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-[15px]">
                <span className="font-medium">
                  {o.provider} {o.type === "data" ? o.data_plan : "airtime"}
                </span>
                <span className="text-muted-foreground">{o.phone_number}</span>
                <span>{formatPrice(o.amount)}</span>
                <StatusBadge status={o.status} />
                <span className="ml-auto text-sm text-muted-foreground">{formatDate(o.created_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Page>
  );
}

function PurchaseFlow({ type, onDone }: { type: "data" | "airtime"; onDone: (o: DataAirtimeOrder) => void }) {
  const { profile } = useAuth();
  const toast = useToast();
  const place = usePlaceDataAirtimeOrder();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [phone, setPhone] = useState("");
  const [plan, setPlan] = useState<DataPlan | null>(null);
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState<{ phone?: string; amount?: string }>({});
  const [review, setReview] = useState(false);

  const total = type === "data" ? plan?.price ?? 0 : Number(amount) || 0;

  function goReview() {
    const errs: typeof errors = {};
    if (!nigerianPhone.safeParse(phone).success) errs.phone = "Enter an 11-digit number starting with 0";
    if (type === "airtime") {
      const a = airtimeAmount.safeParse(amount);
      if (!a.success) errs.amount = a.error.issues[0]?.message ?? "Enter a valid amount";
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (!provider || (type === "data" && !plan)) return;
    setReview(true);
  }

  function pay() {
    if (!provider) return;
    place.mutate(
      { type, provider, phone_number: phone, amount: total, ...(type === "data" && plan ? { data_plan: plan.label } : {}) },
      { onSuccess: (o) => onDone(o), onError: (e) => toast.error(e.message) },
    );
  }

  if (review && provider) {
    return (
      <div className="max-w-md">
        <h2 className="text-lg">Review and confirm</h2>
        <dl className="mt-4 divide-y border-y text-[15px]">
          {[
            ["Network", provider],
            ["Phone number", phone],
            [type === "data" ? "Plan" : "Amount", type === "data" ? `${plan?.label} · ${plan?.validity}` : formatPrice(total)],
            ["Total", formatPrice(total)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-3">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 flex gap-2">
          <button className="btn btn-primary" onClick={pay} disabled={place.isPending}>
            {place.isPending ? "Processing…" : `Pay ${formatPrice(total)}`}
          </button>
          <button className="btn btn-secondary" onClick={() => setReview(false)}>
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section>
        <p className="text-sm font-medium text-muted-foreground">1. Choose network</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PROVIDERS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setProvider(p);
                setPlan(null);
              }}
              aria-pressed={provider === p}
              className={cn("panel relative flex min-h-[72px] items-center gap-3 px-4 text-left transition-colors", provider === p ? "border-primary ring-1 ring-primary" : "hover:border-foreground")}
            >
              <span className={cn("h-3 w-3 rounded-full", PROVIDER_ACCENT[p])} />
              <span className="font-medium">{p}</span>
              {provider === p && <Check size={16} className="absolute right-3 top-3 text-primary" />}
            </button>
          ))}
        </div>
      </section>

      <section className="max-w-md">
        <p className="text-sm font-medium text-muted-foreground">2. Phone number</p>
        <div className="mt-3">
          <Field label="Phone number" htmlFor="phone" error={errors.phone}>
            <input id="phone" inputMode="numeric" className="input" placeholder="08012345678" value={phone} maxLength={11} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} />
          </Field>
          {profile?.phone_number && (
            <button type="button" className="mt-2 text-sm font-medium text-primary" onClick={() => setPhone(profile.phone_number!)}>
              Use my number ({profile.phone_number})
            </button>
          )}
        </div>
      </section>

      {type === "data" ? (
        <section className="max-w-md">
          <p className="text-sm font-medium text-muted-foreground">3. Choose a plan</p>
          {!provider ? (
            <p className="mt-3 text-[15px] text-muted-foreground">Pick a network first.</p>
          ) : (
            <ul className="mt-3 divide-y border-y">
              {DATA_PLANS[provider].map((pl) => (
                <li key={pl.id}>
                  <button type="button" onClick={() => setPlan(pl)} aria-pressed={plan?.id === pl.id} className="flex w-full items-center gap-4 py-3.5 text-left">
                    <span className={cn("flex h-5 w-5 items-center justify-center rounded-full border-2", plan?.id === pl.id ? "border-primary" : "border-border")}>
                      {plan?.id === pl.id && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                    </span>
                    <span className="w-16 font-medium">{pl.label}</span>
                    <span className="flex-1 text-[15px] text-muted-foreground">{pl.validity}</span>
                    <span className="font-medium">{formatPrice(pl.price)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section className="max-w-md">
          <p className="text-sm font-medium text-muted-foreground">3. Amount</p>
          <div className="mt-3">
            <Field label="Amount (₦50 – ₦50,000)" htmlFor="amount" error={errors.amount}>
              <input id="amount" type="number" inputMode="numeric" min={50} max={50000} className="input" placeholder="1000" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
            <div className="mt-2 flex flex-wrap gap-2">
              {[100, 200, 500, 1000, 2000].map((a) => (
                <button key={a} type="button" className="btn btn-secondary btn-sm" onClick={() => setAmount(String(a))}>
                  ₦{a.toLocaleString()}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <button className="btn btn-primary" onClick={goReview} disabled={!provider || (type === "data" && !plan)}>
        {type === "data" && plan ? `Buy ${plan.label} Data` : type === "airtime" && total ? `Buy ${formatPrice(total)} Airtime` : "Continue"}
      </button>
    </div>
  );
}

function Confirmation({ order, onReset }: { order: DataAirtimeOrder; onReset: () => void }) {
  return (
    <div className="mt-8 max-w-md">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Check size={24} />
      </div>
      <h2 className="mt-4 text-2xl">Order received</h2>
      <p className="mt-1 text-[15px] text-muted-foreground">Your {order.provider} {order.type === "data" ? `${order.data_plan} data` : "airtime"} for {order.phone_number} is queued.</p>
      <dl className="mt-5 divide-y border-y text-[15px]">
        <div className="flex justify-between py-3">
          <dt className="text-muted-foreground">Reference</dt>
          <dd className="font-mono text-sm">{order.reference}</dd>
        </div>
        <div className="flex justify-between py-3">
          <dt className="text-muted-foreground">Amount</dt>
          <dd className="font-medium">{formatPrice(order.amount)}</dd>
        </div>
        <div className="flex justify-between py-3">
          <dt className="text-muted-foreground">Status</dt>
          <dd>
            <StatusBadge status={order.status} />
          </dd>
        </div>
      </dl>
      <button className="btn btn-secondary mt-6" onClick={onReset}>
        Buy Another
      </button>
    </div>
  );
}
