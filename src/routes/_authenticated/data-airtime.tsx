import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BookUser, Check, Trash2 } from "lucide-react";
import { Page, PageHeader } from "@/components/layout/PageLayout";
import { useAuth } from "@/hooks/useAuth";
import { useDataAirtimeOrders, usePlaceDataAirtimeOrder } from "@/hooks/useDataAirtime";
import { useDeleteContact, useSaveContact, useSavedContacts } from "@/hooks/useSavedContacts";
import { AIRTIME_MAX, AIRTIME_MIN, DATA_PLANS, PLAN_DURATIONS, PROVIDER_COLORS, PROVIDERS, type DataPlan, type PlanDuration, type Provider } from "@/lib/constants";
import { airtimeAmount, nigerianPhone, savedContactSchema } from "@/lib/validators";
import { Field } from "@/components/shared/Field";
import { Modal } from "@/components/shared/Modal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/Toast";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import type { DataAirtimeOrder, SavedContact } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/data-airtime")({
  head: () => ({ meta: [{ title: "Buy Data & Airtime — PlugZone" }] }),
  component: DataAirtimePage,
});

type Recipient = "self" | "others";

function DataAirtimePage() {
  const [tab, setTab] = useState<"data" | "airtime">("data");
  const [done, setDone] = useState<DataAirtimeOrder | null>(null);
  const history = useDataAirtimeOrders();

  return (
    <Page>
      <PageHeader title="Buy Data & Airtime" subtitle="Top up any MTN, Airtel, Glo or 9mobile number." />
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
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: PROVIDER_COLORS[o.provider as Provider] ?? "#e5e5e5" }} aria-hidden="true" />
                <span className="font-medium">
                  {o.provider} {o.type === "data" ? o.data_plan : "airtime"}
                </span>
                <span className="text-muted-foreground">
                  {o.phone_number}
                  {o.recipient === "others" && " (someone else)"}
                </span>
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
  const { data: contacts = [] } = useSavedContacts();
  const saveContact = useSaveContact();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [recipient, setRecipient] = useState<Recipient>("self");
  const [phone, setPhone] = useState(profile?.phone_number ?? "");
  const [duration, setDuration] = useState<PlanDuration>("Monthly");
  const [plan, setPlan] = useState<DataPlan | null>(null);
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState<{ phone?: string; amount?: string }>({});
  const [review, setReview] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);
  const [saveAfter, setSaveAfter] = useState(false);
  const [saveLabel, setSaveLabel] = useState("");

  const total = type === "data" ? plan?.price ?? 0 : Number(amount) || 0;
  const plans = useMemo(() => (provider ? DATA_PLANS[provider].filter((p) => p.duration === duration) : []), [provider, duration]);
  const knownContact = contacts.find((c) => c.phone_number === phone);

  function chooseRecipient(r: Recipient) {
    setRecipient(r);
    setErrors({});
    setPhone(r === "self" ? profile?.phone_number ?? "" : "");
  }

  function pickContact(c: SavedContact) {
    setPhone(c.phone_number);
    if (c.provider && PROVIDERS.includes(c.provider as Provider)) {
      setProvider(c.provider as Provider);
      setPlan(null);
    }
    setBookOpen(false);
  }

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
      { type, provider, phone_number: phone, amount: total, recipient, ...(type === "data" && plan ? { data_plan: `${plan.label} · ${plan.validity}` } : {}) },
      {
        onSuccess: (o) => {
          if (recipient === "others" && saveAfter && !knownContact) {
            const parsed = savedContactSchema.safeParse({ label: saveLabel, phone_number: phone });
            if (parsed.success) saveContact.mutate({ ...parsed.data, provider });
          }
          onDone(o);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  if (review && provider) {
    return (
      <div className="max-w-md">
        <h2 className="text-lg">Review and confirm</h2>
        <dl className="mt-4 divide-y border-y text-[15px]">
          {[
            ["Network", provider],
            ["Recipient", recipient === "self" ? "My number" : knownContact ? `${knownContact.label}` : "Someone else"],
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
        {recipient === "others" && !knownContact && (
          <div className="mt-4 space-y-2">
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]">
              <input type="checkbox" className="h-4 w-4 accent-primary" checked={saveAfter} onChange={(e) => setSaveAfter(e.target.checked)} />
              Save {phone} to my numbers
            </label>
            {saveAfter && <input className="input" placeholder="Name this number, e.g. Mum" maxLength={40} value={saveLabel} onChange={(e) => setSaveLabel(e.target.value)} aria-label="Contact name" />}
          </div>
        )}
        <div className="mt-6 flex gap-2">
          <button className="btn btn-primary" onClick={pay} disabled={place.isPending || (saveAfter && !saveLabel.trim())}>
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
              <span className="h-3.5 w-3.5 rounded-full border border-border/50" style={{ backgroundColor: PROVIDER_COLORS[p] }} aria-hidden="true" />
              <span className="font-medium">{p}</span>
              {provider === p && <Check size={16} className="absolute right-3 top-3 text-primary" />}
            </button>
          ))}
        </div>
      </section>

      <section className="max-w-md">
        <p className="text-sm font-medium text-muted-foreground">2. Who is this for?</p>
        <div className="mt-3 flex border-b">
          <button type="button" className="tab" data-active={recipient === "self"} onClick={() => chooseRecipient("self")}>
            Top-up for Self
          </button>
          <button type="button" className="tab" data-active={recipient === "others"} onClick={() => chooseRecipient("others")}>
            Top-up for Others
          </button>
        </div>
        <div className="mt-4">
          <Field label="Phone number" htmlFor="phone" error={errors.phone} hint={knownContact ? `Saved as “${knownContact.label}”` : undefined}>
            <input id="phone" inputMode="numeric" className="input" placeholder="08012345678" value={phone} maxLength={11} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} />
          </Field>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {recipient === "self" && profile?.phone_number && phone !== profile.phone_number && (
              <button type="button" className="min-h-11 text-sm font-medium text-primary" onClick={() => setPhone(profile.phone_number!)}>
                Use my number ({profile.phone_number})
              </button>
            )}
            {recipient === "self" && !profile?.phone_number && <p className="text-sm text-muted-foreground">Save your own number in Settings to fill this automatically.</p>}
            {recipient === "others" && (
              <button type="button" className="flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary" onClick={() => setBookOpen(true)}>
                <BookUser size={16} /> {contacts.length ? `Pick from my numbers (${contacts.length})` : "My numbers"}
              </button>
            )}
          </div>
        </div>
      </section>

      {type === "data" ? (
        <section className="max-w-md">
          <p className="text-sm font-medium text-muted-foreground">3. Choose a plan</p>
          {!provider ? (
            <p className="mt-3 text-[15px] text-muted-foreground">Pick a network first.</p>
          ) : (
            <>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                {PLAN_DURATIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className="badge shrink-0"
                    data-active={duration === d}
                    onClick={() => {
                      setDuration(d);
                      setPlan(null);
                    }}
                  >
                    {d === "Social" ? "Social plans" : d}
                  </button>
                ))}
              </div>
              <ul className="mt-3 divide-y border-y">
                {plans.map((pl) => (
                  <li key={pl.id}>
                    <button type="button" onClick={() => setPlan(pl)} aria-pressed={plan?.id === pl.id} className="flex w-full items-center gap-4 py-3.5 text-left">
                      <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2", plan?.id === pl.id ? "border-primary" : "border-border")}>
                        {plan?.id === pl.id && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{pl.label}</span>
                        <span className="block text-sm text-muted-foreground">
                          {pl.validity}
                          {pl.note ? ` · ${pl.note}` : ""}
                        </span>
                      </span>
                      <span className="font-medium">{formatPrice(pl.price)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      ) : (
        <section className="max-w-md">
          <p className="text-sm font-medium text-muted-foreground">3. Amount</p>
          <div className="mt-3">
            <Field label={`Amount (${formatPrice(AIRTIME_MIN)} – ${formatPrice(AIRTIME_MAX)})`} htmlFor="amount" error={errors.amount}>
              <input id="amount" type="number" inputMode="numeric" min={AIRTIME_MIN} max={AIRTIME_MAX} className="input" placeholder="1000" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
            <div className="mt-2 flex flex-wrap gap-2">
              {[100, 200, 500, 1000, 2000, 5000].map((a) => (
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

      <AddressBook open={bookOpen} onClose={() => setBookOpen(false)} contacts={contacts} onPick={pickContact} />
    </div>
  );
}

function AddressBook({ open, onClose, contacts, onPick }: { open: boolean; onClose: () => void; contacts: SavedContact[]; onPick: (c: SavedContact) => void }) {
  const toast = useToast();
  const save = useSaveContact();
  const remove = useDeleteContact();
  const [label, setLabel] = useState("");
  const [phone, setPhone] = useState("");
  const [provider, setProvider] = useState<Provider | "">("");
  const [errors, setErrors] = useState<{ label?: string; phone_number?: string }>({});

  function add(e: React.FormEvent) {
    e.preventDefault();
    const parsed = savedContactSchema.safeParse({ label, phone_number: phone });
    if (!parsed.success) {
      const errs: typeof errors = {};
      parsed.error.issues.forEach((i) => {
        const k = i.path[0] as keyof typeof errors;
        if (!errs[k]) errs[k] = i.message;
      });
      setErrors(errs);
      return;
    }
    setErrors({});
    save.mutate(
      { ...parsed.data, provider: provider || null },
      {
        onSuccess: () => {
          setLabel("");
          setPhone("");
          setProvider("");
          toast.success("Number saved");
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="My numbers">
      {contacts.length ? (
        <ul className="divide-y border-y">
          {contacts.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-2">
              <button type="button" className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left" onClick={() => onPick(c)}>
                {c.provider && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: PROVIDER_COLORS[c.provider as Provider] }} aria-hidden="true" />}
                <span className="min-w-0">
                  <span className="block truncate font-medium">{c.label}</span>
                  <span className="block text-sm text-muted-foreground">
                    {c.phone_number}
                    {c.provider ? ` · ${c.provider}` : ""}
                  </span>
                </span>
              </button>
              <button type="button" className="flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-destructive" aria-label={`Remove ${c.label}`} onClick={() => remove.mutate(c.id)}>
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[15px] text-muted-foreground">No saved numbers yet. Add one below to reuse it for future top-ups.</p>
      )}

      <form onSubmit={add} noValidate className="mt-5 space-y-3 border-t pt-5">
        <p className="text-sm font-medium">Add a number</p>
        <Field label="Name" htmlFor="contact-label" error={errors.label}>
          <input id="contact-label" className="input" maxLength={40} placeholder="e.g. Mum, Office line" value={label} onChange={(e) => setLabel(e.target.value)} />
        </Field>
        <Field label="Phone number" htmlFor="contact-phone" error={errors.phone_number}>
          <input id="contact-phone" inputMode="numeric" className="input" maxLength={11} placeholder="08012345678" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} />
        </Field>
        <Field label="Network (optional)" htmlFor="contact-provider">
          <select id="contact-provider" className="input" value={provider} onChange={(e) => setProvider(e.target.value as Provider | "")}>
            <option value="">Not sure</option>
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save Number"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Confirmation({ order, onReset }: { order: DataAirtimeOrder; onReset: () => void }) {
  return (
    <div className="mt-8 max-w-md">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Check size={24} />
      </div>
      <h2 className="mt-4 text-2xl">Order received</h2>
      <p className="mt-1 text-[15px] text-muted-foreground">
        Your {order.provider} {order.type === "data" ? `${order.data_plan} data` : "airtime"} for {order.phone_number} is queued.
      </p>
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
