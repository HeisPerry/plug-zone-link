import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, Banknote, Clock, ShieldCheck, Store, Wallet as WalletIcon } from "lucide-react";
import { Page, PageHero } from "@/components/layout/PageLayout";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import { useRequestWithdrawal, useSellerEarnings, useSellerProfile, useWithdrawals } from "@/hooks/useSeller";
import { useToast } from "@/components/shared/Toast";
import { ListSkeleton } from "@/components/shared/SkeletonLoader";
import { EmptyState, ErrorState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Modal } from "@/components/shared/Modal";
import { Field } from "@/components/shared/Field";
import { cn, formatDate, formatPrice } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet — PlugZone" },
      { name: "description", content: "Track your PlugZone earnings, escrow balance and payout requests in one place." },
      { property: "og:title", content: "Your PlugZone wallet" },
      { property: "og:description", content: "Earnings, escrow balance and payouts in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WalletPage,
});

function WalletPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { data, isLoading, isError, refetch } = useWallet();
  const { data: seller } = useSellerProfile();
  const { data: earnings } = useSellerEarnings();
  const { data: allWithdrawals } = useWithdrawals();
  const withdrawals = (allWithdrawals ?? []).filter((w) => w.kind === "sales");
  const requestWithdrawal = useRequestWithdrawal();
  const currency = data?.currency ?? "NGN";

  const [payoutOpen, setPayoutOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank");
  const [destination, setDestination] = useState("");

  const available = earnings?.available ?? 0;

  const submitPayout = () => {
    const value = Number(amount);
    if (!value || value <= 0) return toast.error("Enter how much you want to withdraw");
    if (value > available) return toast.error("That is more than your available balance");
    requestWithdrawal.mutate(
      { amount: value, method, destination, kind: "sales" },
      {
        onSuccess: () => {
          toast.success("Payout requested. We'll review it shortly.");
          setPayoutOpen(false);
          setAmount("");
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <>
      <PageHero
        compact
        eyebrow="Wallet"
        title="Your money, in one place"
        subtitle="Money from completed orders lands here. Request a payout whenever your balance is available."
        action={
          seller ? (
            <button className="btn btn-primary" onClick={() => setPayoutOpen(true)}>
              <Banknote size={18} /> Request payout
            </button>
          ) : (
            <Link to="/sell" className="btn btn-primary">
              <Store size={18} /> Start selling
            </Link>
          )
        }
      />
      <Page wide>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="panel brand-gradient relative overflow-hidden p-6 text-primary-foreground md:col-span-1">
            <WalletIcon className="absolute -right-4 -top-4 h-28 w-28 opacity-15" />
            <p className="text-sm font-medium opacity-90">Available balance</p>
            <p className="mt-2 font-heading text-[36px] font-extrabold leading-none">{formatPrice(available, currency)}</p>
            <p className="mt-4 text-sm opacity-90">Released by buyers and free to withdraw</p>
          </div>
          <Stat icon={ShieldCheck} label="Held in escrow" value={formatPrice(earnings?.escrow_held ?? 0, currency)} hint="Waiting for buyers to confirm" />
          <Stat icon={Clock} label="Payouts pending" value={formatPrice(earnings?.pending_withdrawals ?? 0, currency)} hint="Requested and under review" />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Stat icon={ArrowDownLeft} label="Total sales" value={formatPrice(earnings?.total_sales ?? 0, currency)} hint="Before the platform fee" />
          <Stat icon={ArrowUpRight} label="Platform fees" value={formatPrice(earnings?.platform_fees ?? 0, currency)} hint="Our share of completed sales" />
          <Stat icon={Banknote} label="Paid out" value={formatPrice(earnings?.withdrawn ?? 0, currency)} hint="Sent to your payout account" />
        </div>

        <section className="mt-10">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl">Payouts</h2>
            {seller && (
              <button className="text-[15px] font-semibold text-primary" onClick={() => setPayoutOpen(true)}>
                Request payout
              </button>
            )}
          </div>
          <div className="mt-4">
            {!withdrawals?.length ? (
              <EmptyState title="No payouts yet" body="When you withdraw money, each request shows here with its status." />
            ) : (
              <ul className="panel divide-y overflow-hidden">
                {withdrawals.map((w) => (
                  <li key={w.id} className="flex items-center gap-4 px-5 py-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Banknote size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">Payout to {w.method.replace(/_/g, " ")}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {formatDate(w.created_at)}
                        {w.admin_note ? ` · ${w.admin_note}` : ""}
                      </p>
                    </div>
                    <StatusBadge status={w.status} className="hidden sm:inline-flex" />
                    <span className="font-heading font-bold">{formatPrice(w.amount, w.currency)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl">Transactions</h2>
            <Link to="/orders" className="text-[15px] font-semibold text-primary">
              View orders
            </Link>
          </div>
          <div className="mt-4">
            {isLoading ? (
              <ListSkeleton rows={4} />
            ) : isError ? (
              <ErrorState onRetry={() => refetch()} />
            ) : !data?.transactions.length ? (
              <EmptyState title="No transactions yet" body="Payments you send or receive on orders will be listed here." />
            ) : (
              <ul className="panel divide-y overflow-hidden">
                {data.transactions.map((t) => {
                  const incoming = t.payee_id === user?.id;
                  return (
                    <li key={t.id} className="flex items-center gap-4 px-5 py-4">
                      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", incoming ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground")}>
                        {incoming ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{incoming ? "Payment received" : "Payment sent"}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          Ref {t.reference} · {formatDate(t.created_at)}
                        </p>
                      </div>
                      <StatusBadge status={t.status} className="hidden sm:inline-flex" />
                      <span className={cn("font-heading font-bold", incoming ? "text-primary" : "")}>
                        {incoming ? "+" : "−"}
                        {formatPrice(incoming ? t.seller_earnings : t.amount, t.currency)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </Page>

      <Modal open={payoutOpen} onClose={() => setPayoutOpen(false)} title="Request a payout">
        <p className="mb-4 text-[15px] text-muted-foreground">Available now: {formatPrice(available, currency)}</p>
        <Field label="Amount" htmlFor="amount">
          <input id="amount" className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        </Field>
        <div className="mt-4" />
        <Field label="Send it to" htmlFor="method">
          <select id="method" className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="bank">Bank transfer</option>
            <option value="mobile_money">Mobile money</option>
          </select>
        </Field>
        <div className="mt-4" />
        <Field label="Account details (optional)" htmlFor="dest" hint="Leave blank to use the details on your seller account.">
          <input id="dest" className="input" value={destination} onChange={(e) => setDestination(e.target.value)} />
        </Field>
        <button className="btn btn-primary mt-4 w-full" disabled={requestWithdrawal.isPending} onClick={submitPayout}>
          {requestWithdrawal.isPending ? "Sending…" : "Request payout"}
        </button>
      </Modal>
    </>
  );
}

function Stat({ icon: Icon, label, value, hint }: { icon: typeof Clock; label: string; value: string; hint: string }) {
  return (
    <div className="panel flex items-start gap-4 p-6">
      <span className="icon-tile h-12 w-12 rounded-2xl">
        <Icon size={20} />
      </span>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 font-heading text-[28px] font-extrabold leading-none">{value}</p>
        <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}
