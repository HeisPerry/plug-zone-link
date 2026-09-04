import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, Banknote, Clock, Plus, Wallet as WalletIcon } from "lucide-react";
import { Page, PageHero } from "@/components/layout/PageLayout";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/shared/Toast";
import { ListSkeleton } from "@/components/shared/SkeletonLoader";
import { EmptyState, ErrorState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { cn, formatDate, formatPrice } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({ meta: [{ title: "Wallet — PlugZone" }] }),
  component: WalletPage,
});

function WalletPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { data, isLoading, isError, refetch } = useWallet();
  const currency = data?.currency ?? "NGN";

  const comingSoon = () => toast.toast("Payments are being connected. Funding and withdrawals open soon.");

  return (
    <>
      <PageHero
        compact
        eyebrow="Wallet"
        title="Your money, in one place"
        subtitle="Earnings from completed orders land here. Fund your wallet to pay sellers instantly."
        action={
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={comingSoon}>
              <Plus size={18} /> Fund Wallet
            </button>
            <button className="btn btn-secondary" onClick={comingSoon}>
              <Banknote size={18} /> Withdraw
            </button>
          </div>
        }
      />
      <Page wide>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="panel brand-gradient relative overflow-hidden p-6 text-primary-foreground md:col-span-1">
            <WalletIcon className="absolute -right-4 -top-4 h-28 w-28 opacity-15" />
            <p className="text-sm font-medium opacity-90">Available balance</p>
            <p className="mt-2 font-heading text-[36px] font-extrabold leading-none">{data ? formatPrice(data.balance, currency) : "—"}</p>
            <p className="mt-4 text-sm opacity-90">Ready to withdraw once payouts open</p>
          </div>
          <Stat icon={ArrowDownLeft} label="Total earned" value={data ? formatPrice(data.earned, currency) : "—"} hint="After the platform fee" />
          <Stat icon={Clock} label="Pending" value={data ? formatPrice(data.pending, currency) : "—"} hint="Awaiting buyer payment" />
        </div>

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
