import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Banknote, Check, Copy, Gift, Users } from "lucide-react";
import { Page, PageHero } from "@/components/layout/PageLayout";
import { EmptyState } from "@/components/shared/EmptyState";
import { ListSkeleton } from "@/components/shared/SkeletonLoader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Modal } from "@/components/shared/Modal";
import { Field } from "@/components/shared/Field";
import { useToast } from "@/components/shared/Toast";
import { useAuth } from "@/hooks/useAuth";
import { useAffiliateStats, useReferredMembers, useRewardBalances, useRewardEntries, type RewardKind } from "@/hooks/useAffiliate";
import { useRequestWithdrawal, useWithdrawals } from "@/hooks/useSeller";
import { formatDate, formatPrice } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/affiliate")({
  head: () => ({
    meta: [
      { title: "Referrals & commissions — PlugZone" },
      { name: "description", content: "Share your PlugZone link, earn a commission on every order your referrals complete, and cash out your rewards." },
      { property: "og:title", content: "Earn with PlugZone referrals" },
      { property: "og:description", content: "Commission on referred orders plus referral rewards, each with its own payouts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AffiliatePage,
});

const LABELS: Record<RewardKind, { title: string; hint: string }> = {
  affiliate: { title: "Commission balance", hint: "A share of every order completed by someone you referred" },
  referral: { title: "Referral rewards", hint: "One-off rewards for friends who join and buy" },
};

const ENTRY_LABEL: Record<string, string> = {
  commission: "Commission on a referred order",
  signup_bonus: "A friend joined with your link",
  first_order_bonus: "A friend completed their first order",
  adjustment: "Adjustment by the PlugZone team",
};

function AffiliatePage() {
  const { profile } = useAuth();
  const toast = useToast();
  const { data: stats } = useAffiliateStats();
  const { data: balances, isLoading: loadingBalances } = useRewardBalances();
  const { data: entries, isLoading: loadingEntries } = useRewardEntries();
  const { data: referred } = useReferredMembers();
  const { data: withdrawals } = useWithdrawals();
  const requestWithdrawal = useRequestWithdrawal();

  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);
  const link = `${origin}/join?ref=${profile?.affiliate_code ?? ""}`;

  const [payoutKind, setPayoutKind] = useState<RewardKind | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank");
  const [destination, setDestination] = useState("");
  const available = payoutKind ? (balances?.[payoutKind].available ?? 0) : 0;

  const submitPayout = () => {
    if (!payoutKind) return;
    const value = Number(amount);
    if (!value || value <= 0) return toast.error("Enter how much you want to withdraw");
    if (value > available) return toast.error("That is more than your available balance");
    requestWithdrawal.mutate(
      { amount: value, method, destination, kind: payoutKind },
      {
        onSuccess: () => {
          toast.success("Payout requested. We'll review it shortly.");
          setPayoutKind(null);
          setAmount("");
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const rewardPayouts = (withdrawals ?? []).filter((w) => w.kind === "affiliate" || w.kind === "referral");

  return (
    <>
      <PageHero
        compact
        eyebrow="Earn"
        title="Referrals & commissions"
        subtitle="Share your link. You earn a share of every order the people you bring complete, plus one-off rewards."
      />
      <Page wide>
        <div className="panel p-6">
          <p className="font-semibold">Your referral link</p>
          <p className="mt-1 text-[15px] text-muted-foreground">Anyone who signs up through this link is counted as yours. You cannot refer yourself.</p>
          <div className="mt-4 flex gap-2">
            <input className="input font-mono text-sm" readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Your referral link" />
            <button
              type="button"
              className="btn btn-secondary shrink-0"
              onClick={async () => {
                await navigator.clipboard.writeText(link);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copied" : "Copy link"}
            </button>
          </div>
          <dl className="mt-6 flex flex-wrap gap-8">
            {[
              ["Link clicks", stats?.clicks],
              ["People joined", stats?.signups ?? profile?.total_referrals],
              ["Conversion", stats ? `${stats.rate}%` : undefined],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dd className="font-heading text-2xl font-bold">{value ?? "—"}</dd>
                <dt className="text-sm text-muted-foreground">{label}</dt>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {(["affiliate", "referral"] as RewardKind[]).map((kind) => {
            const b = balances?.[kind];
            return (
              <div key={kind} className="panel p-6">
                <div className="flex items-start gap-4">
                  <span className="icon-tile h-12 w-12 rounded-2xl">{kind === "affiliate" ? <Banknote size={20} /> : <Gift size={20} />}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{LABELS[kind].title}</p>
                    <p className="text-sm text-muted-foreground">{LABELS[kind].hint}</p>
                    <p className="mt-3 font-heading text-[30px] font-extrabold leading-none">{loadingBalances ? "—" : formatPrice(b?.available ?? 0, "NGN")}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Earned {formatPrice(b?.earned ?? 0, "NGN")} · Paid out {formatPrice(b?.withdrawn ?? 0, "NGN")}
                      {b?.pending_withdrawals ? ` · ${formatPrice(b.pending_withdrawals, "NGN")} awaiting review` : ""}
                    </p>
                  </div>
                </div>
                <button className="btn btn-primary mt-4 w-full" disabled={!b || b.available <= 0} onClick={() => setPayoutKind(kind)}>
                  <Banknote size={18} /> Cash out
                </button>
              </div>
            );
          })}
        </div>

        <section className="mt-10">
          <h2 className="text-xl">Earnings history</h2>
          <div className="mt-4">
            {loadingEntries ? (
              <ListSkeleton rows={3} />
            ) : !entries?.length ? (
              <EmptyState title="Nothing yet" body="Once someone you referred completes an order, your earnings show up here." />
            ) : (
              <ul className="panel divide-y overflow-hidden">
                {entries.map((e) => (
                  <li key={e.id} className="flex items-center gap-4 px-5 py-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                      {e.kind === "affiliate" ? <Banknote size={18} /> : <Gift size={18} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{ENTRY_LABEL[e.entry_type] ?? e.entry_type.replace(/_/g, " ")}</p>
                      <p className="truncate text-sm text-muted-foreground">{formatDate(e.created_at)}</p>
                    </div>
                    <span className="font-heading font-bold text-primary">+{formatPrice(Number(e.amount), e.currency)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl">Reward payouts</h2>
          <div className="mt-4">
            {!rewardPayouts.length ? (
              <EmptyState title="No reward payouts yet" body="When you cash out commissions or rewards, each request shows here with its status." />
            ) : (
              <ul className="panel divide-y overflow-hidden">
                {rewardPayouts.map((w) => (
                  <li key={w.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{w.kind === "affiliate" ? "Commission payout" : "Reward payout"}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {formatDate(w.created_at)} · {w.method.replace(/_/g, " ")}
                        {w.admin_note ? ` · ${w.admin_note}` : ""}
                      </p>
                    </div>
                    <StatusBadge status={w.status} className="hidden sm:inline-flex" />
                    <span className="font-heading font-bold">{formatPrice(Number(w.amount), w.currency)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl">People you brought</h2>
          <div className="mt-4">
            {!referred?.length ? (
              <EmptyState title="No referrals yet" body="Share your link with friends — they show up here as soon as they join." />
            ) : (
              <ul className="panel divide-y overflow-hidden">
                {referred.map((p) => (
                  <li key={p.id} className="flex items-center gap-4 px-5 py-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Users size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{p.display_name}</p>
                      <p className="truncate text-sm text-muted-foreground">@{p.username} · joined {formatDate(p.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </Page>

      <Modal open={!!payoutKind} onClose={() => setPayoutKind(null)} title={payoutKind === "referral" ? "Cash out referral rewards" : "Cash out commissions"}>
        <p className="mb-4 text-[15px] text-muted-foreground">Available now: {formatPrice(available, "NGN")}</p>
        <Field label="Amount" htmlFor="reward-amount">
          <input id="reward-amount" className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        </Field>
        <div className="mt-4" />
        <Field label="Send it to" htmlFor="reward-method">
          <select id="reward-method" className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="bank">Bank transfer</option>
            <option value="mobile_money">Mobile money</option>
          </select>
        </Field>
        <div className="mt-4" />
        <Field label="Account details (optional)" htmlFor="reward-dest" hint="Leave blank to use the details we already have for you.">
          <input id="reward-dest" className="input" value={destination} onChange={(e) => setDestination(e.target.value)} />
        </Field>
        <button className="btn btn-primary mt-4 w-full" disabled={requestWithdrawal.isPending} onClick={submitPayout}>
          {requestWithdrawal.isPending ? "Sending…" : "Request payout"}
        </button>
      </Modal>
    </>
  );
}
