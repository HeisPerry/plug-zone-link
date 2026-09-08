import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Banknote, ListChecks, ShieldCheck, Users, Settings2, TrendingUp, ShoppingBag, UserCheck, Store, Crown, UserPlus } from "lucide-react";
import { Page, PageHero } from "@/components/layout/PageLayout";
import { EmptyState } from "@/components/shared/EmptyState";
import { ListSkeleton, Skeleton } from "@/components/shared/SkeletonLoader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Avatar } from "@/components/shared/Avatar";
import { useToast } from "@/components/shared/Toast";
import {
  useAdminAds,
  useAdminInvites,
  useAdminOverview,
  useAdminTeam,
  useAdminTeamActions,
  useAdminWeekly,
  useAdminWithdrawals,
  useIsAdmin,
  useIsSuperAdmin,
  usePlatformSettings,
  useSetAdStatus,
  useSetWithdrawalStatus,
  useUpdateSetting,
} from "@/hooks/useAdmin";
import { useSearchPeople } from "@/hooks/useFriends";
import { useDebounce } from "@/hooks/useDebounce";
import { useMyDisputes } from "@/hooks/useDisputes";
import { useAllCoupons } from "@/hooks/useCoupons";
import { CouponManager } from "@/components/coupons/CouponManager";
import { cn, formatDate, formatPrice } from "@/lib/utils";


function CouponsTab() {
  const { data, isLoading } = useAllCoupons(true);
  return <CouponManager mode="admin" coupons={data} isLoading={isLoading} />;
}

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — PlugZone" },
      { name: "description", content: "PlugZone admin tools: platform totals, reported orders, payout requests and listing moderation." },
      { property: "og:title", content: "PlugZone admin" },
      { property: "og:description", content: "Platform totals, reported orders, payouts and listing moderation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

type Tab = "overview" | "reports" | "payouts" | "listings" | "coupons" | "admins" | "settings";

function AdminPage() {
  const { data: isAdmin, isLoading: checking } = useIsAdmin();
  const [tab, setTab] = useState<Tab>("overview");

  if (checking) {
    return (
      <Page>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-6 h-64 w-full" />
      </Page>
    );
  }

  if (!isAdmin) {
    return (
      <Page>
        <EmptyState title="Admins only" body="This area is for the PlugZone team." />
        <Link to="/dashboard" className="btn btn-primary mt-6">
          Back to marketplace
        </Link>
      </Page>
    );
  }

  return (
    <>
      <PageHero compact eyebrow="Admin" title="Run the marketplace" subtitle="Totals, reported orders, payout requests and listings — all in one place." />
      <Page wide>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["overview", "Overview"],
              ["reports", "Reported orders"],
              ["payouts", "Payout requests"],
              ["listings", "Listings"],
              ["coupons", "Coupons"],
              ["admins", "Admins"],
              ["settings", "Escrow & fees"],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button key={key} className={cn("pill", tab !== key && "pill-muted")} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "overview" && <Overview />}
          {tab === "reports" && <Reports />}
          {tab === "payouts" && <Payouts />}
          {tab === "listings" && <Listings />}
          {tab === "coupons" && <CouponsTab />}
          {tab === "admins" && <AdminsTab />}
          {tab === "settings" && <SettingsTab />}

        </div>
      </Page>
    </>
  );
}

function Overview() {
  const { data, isLoading } = useAdminOverview(true);
  return (
    <div className="space-y-8">
      <WeeklyTotals />
      <section>
        <h2 className="font-heading text-lg font-bold">All time</h2>
        <div className="mt-3">
          {isLoading ? (
            <ListSkeleton rows={3} />
          ) : !data ? (
            <EmptyState title="No data yet" body="Totals appear once there is activity on the marketplace." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Stat icon={Users} label="Members" value={String(data.total_users)} />
              <Stat icon={ListChecks} label="Listings live" value={`${data.active_ads} of ${data.total_ads}`} />
              <Stat icon={ListChecks} label="Orders placed" value={String(data.total_orders)} />
              <Stat icon={ShieldCheck} label="Held in escrow" value={formatPrice(data.escrow_held, "NGN")} />
              <Stat icon={Banknote} label="Money processed" value={formatPrice(data.gross_sales, "NGN")} />
              <Stat icon={Banknote} label="Platform fees" value={formatPrice(data.platform_fees, "NGN")} />
              <Stat icon={AlertTriangle} label="Open reports" value={String(data.open_disputes)} />
              <Stat icon={Banknote} label="Payouts waiting" value={String(data.pending_withdrawals)} />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function WeeklyTotals() {
  const { data, isLoading } = useAdminWeekly(true);
  return (
    <section>
      <h2 className="font-heading text-lg font-bold">This week</h2>
      <p className="text-sm text-muted-foreground">The last 7 days on PlugZone.</p>
      <div className="mt-3">
        {isLoading ? (
          <ListSkeleton rows={2} />
        ) : !data ? (
          <EmptyState title="Nothing this week" body="Weekly totals appear once there is activity." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Stat icon={TrendingUp} label="Total sales value" value={formatPrice(data.gmv, "NGN")} />
            <Stat icon={ShoppingBag} label="Orders" value={String(data.orders_count)} />
            <Stat icon={ShieldCheck} label="Money placed on hold" value={formatPrice(data.escrow_volume, "NGN")} />
            <Stat icon={UserCheck} label="Buyers who ordered" value={String(data.active_buyers)} />
            <Stat icon={Store} label="Sellers who sold" value={String(data.active_sellers)} />
            <Stat icon={AlertTriangle} label="Orders reported" value={`${data.dispute_rate}% (${data.disputes_count})`} />
          </div>
        )}
      </div>
    </section>
  );
}

function AdminsTab() {
  const toast = useToast();
  const { data: isSuper } = useIsSuperAdmin();
  const { data: team, isLoading } = useAdminTeam(true);
  const { data: invites } = useAdminInvites(true);
  const { invite, revoke, remove } = useAdminTeamActions();
  const [term, setTerm] = useState("");
  const debounced = useDebounce(term, 300);
  const { data: people } = useSearchPeople(isSuper ? debounced : "");
  const pending = (invites ?? []).filter((i) => i.status === "pending");

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-heading text-lg font-bold">Admin team</h2>
        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : (
          <ul className="panel mt-3 divide-y overflow-hidden">
            {(team ?? []).map((a) => (
              <li key={a.user_id} className="flex items-center gap-3 px-5 py-4">
                <Avatar name={a.display_name} username={a.username} src={a.avatar_url} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {a.display_name} {a.is_super && <span className="pill pill-muted ml-1 align-middle text-xs"><Crown size={12} /> Owner</span>}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">@{a.username} · since {formatDate(a.since)}</p>
                </div>
                {isSuper && !a.is_super && (
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(a.user_id, { onSuccess: () => toast.success("Admin access removed"), onError: (e) => toast.error(e.message) })}
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {isSuper ? (
        <section>
          <h2 className="font-heading text-lg font-bold">Invite someone</h2>
          <p className="text-sm text-muted-foreground">Search by username. They get a notification and choose to accept or decline.</p>
          <input className="input mt-3" placeholder="Search username" aria-label="Search username" value={term} onChange={(e) => setTerm(e.target.value)} />
          {!!people?.length && (
            <ul className="panel mt-3 divide-y overflow-hidden">
              {people.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar name={p.display_name} username={p.username} src={p.avatar_url} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{p.display_name}</p>
                    <p className="truncate text-sm text-muted-foreground">@{p.username}</p>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={invite.isPending}
                    onClick={() =>
                      invite.mutate(
                        { userId: p.id },
                        { onSuccess: () => { toast.success("Invite sent"); setTerm(""); }, onError: (e) => toast.error(e.message) },
                      )
                    }
                  >
                    <UserPlus size={14} /> Invite
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">Only the owner account can invite or remove admins.</p>
      )}

      <section>
        <h2 className="font-heading text-lg font-bold">Invites</h2>
        {!invites?.length ? (
          <EmptyState title="No invites yet" body="Admin invites you send show up here." />
        ) : (
          <ul className="panel mt-3 divide-y overflow-hidden">
            {invites.map((i) => (
              <li key={i.id} className="flex items-center gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{i.invitee ? `${i.invitee.display_name} (@${i.invitee.username})` : "Member"}</p>
                  <p className="truncate text-sm text-muted-foreground">Sent {formatDate(i.created_at)}</p>
                </div>
                <StatusBadge status={i.status} />
                {isSuper && i.status === "pending" && (
                  <button className="btn btn-ghost btn-sm" disabled={revoke.isPending} onClick={() => revoke.mutate(i.id, { onSuccess: () => toast.success("Invite cancelled"), onError: (e) => toast.error(e.message) })}>
                    Cancel
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {!!pending.length && <p className="mt-2 text-xs text-muted-foreground">{pending.length} waiting for a reply.</p>}
      </section>
    </div>
  );
}


function Reports() {
  const { data, isLoading } = useMyDisputes();
  if (isLoading) return <ListSkeleton rows={4} />;
  if (!data?.length) return <EmptyState title="No reports" body="Nothing has been reported on the marketplace." />;
  return (
    <ul className="panel divide-y overflow-hidden">
      {data.map((d) => (
        <li key={d.id}>
          <Link to="/dispute/$disputeId" params={{ disputeId: d.id }} className="flex items-center gap-4 px-5 py-4 hover:bg-muted">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{d.ad_title}</p>
              <p className="truncate text-sm text-muted-foreground">
                @{d.buyer.username} vs @{d.seller.username} · {d.reason.replace(/_/g, " ")} · {formatDate(d.created_at)}
              </p>
            </div>
            <StatusBadge status={d.status} className="hidden sm:inline-flex" />
            <span className="font-heading font-bold">{formatPrice(d.total_price, d.currency)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Payouts() {
  const toast = useToast();
  const { data, isLoading } = useAdminWithdrawals(true);
  const setStatus = useSetWithdrawalStatus();
  if (isLoading) return <ListSkeleton rows={4} />;
  if (!data?.length) return <EmptyState title="No payout requests" body="Sellers' payout requests show up here." />;
  const act = (id: string, status: string, text: string) =>
    setStatus.mutate({ id, status }, { onSuccess: () => toast.success(text), onError: (e) => toast.error(e.message) });
  return (
    <ul className="panel divide-y overflow-hidden">
      {data.map((w) => (
        <li key={w.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">
              {formatPrice(w.amount, w.currency)} · {w.method.replace(/_/g, " ")} · {w.kind === "affiliate" ? "commissions" : w.kind === "referral" ? "referral rewards" : "sales"}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {formatDate(w.created_at)}
              {w.destination ? ` · ${w.destination}` : ""}
            </p>
          </div>
          <StatusBadge status={w.status} />
          {w.status === "pending" && (
            <div className="flex gap-2">
              <button className="btn btn-secondary btn-sm" onClick={() => act(w.id, "approved", "Payout approved")}>
                Approve
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => act(w.id, "paid", "Marked as paid")}>
                Mark paid
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => act(w.id, "rejected", "Payout rejected")}>
                Reject
              </button>
            </div>
          )}
          {w.status === "approved" && (
            <button className="btn btn-primary btn-sm" onClick={() => act(w.id, "paid", "Marked as paid")}>
              Mark paid
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function Listings() {
  const toast = useToast();
  const { data, isLoading } = useAdminAds(true);
  const setStatus = useSetAdStatus();
  if (isLoading) return <ListSkeleton rows={4} />;
  if (!data?.length) return <EmptyState title="No listings" body="Nothing has been posted yet." />;
  return (
    <ul className="panel divide-y overflow-hidden">
      {data.map((ad) => (
        <li key={ad.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
          {ad.images[0] && <img src={ad.images[0]} alt="" className="h-12 w-12 rounded-md object-cover" loading="lazy" />}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{ad.title}</p>
            <p className="truncate text-sm text-muted-foreground">
              {ad.category} · {formatPrice(ad.price, ad.currency)} · {formatDate(ad.created_at)}
            </p>
          </div>
          <StatusBadge status={ad.status} className="hidden sm:inline-flex" />
          <div className="flex gap-2">
            <Link to="/ad/$adId" params={{ adId: ad.id }} className="btn btn-secondary btn-sm">
              View
            </Link>
            {ad.status === "deleted" ? (
              <button className="btn btn-ghost btn-sm" onClick={() => setStatus.mutate({ id: ad.id, status: "active" }, { onSuccess: () => toast.success("Listing restored"), onError: (e) => toast.error(e.message) })}>
                Restore
              </button>
            ) : (
              <button className="btn btn-danger btn-sm" onClick={() => setStatus.mutate({ id: ad.id, status: "deleted" }, { onSuccess: () => toast.success("Listing taken down"), onError: (e) => toast.error(e.message) })}>
                Take down
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

const SETTING_META: Record<string, { label: string; hint: string; step: string; format: (v: number) => string }> = {
  
  platform_fee_rate: { label: "Platform fee", hint: "Share of each completed sale kept by PlugZone. 0.05 means 5%.", step: "0.005", format: (v) => `${Math.round(v * 1000) / 10}%` },
  affiliate_commission_rate: { label: "Affiliate commission", hint: "Share of each completed order paid to whoever referred the buyer. 0.02 means 2%.", step: "0.005", format: (v) => `${Math.round(v * 1000) / 10}%` },
  referral_signup_reward: { label: "Reward for a signup", hint: "Paid to the referrer when a friend joins with their link. 0 turns it off.", step: "50", format: (v) => `₦${v.toLocaleString()}` },
  referral_first_order_reward: { label: "Reward for a first order", hint: "Paid to the referrer when a friend they brought completes their first order.", step: "50", format: (v) => `₦${v.toLocaleString()}` },
  refund_window_days: { label: "Refund window (days)", hint: "How long after delivery a buyer may ask for a refund.", step: "1", format: (v) => `${v} day${v === 1 ? "" : "s"}` },
  trust_weight_sales: { label: "Trust: completed sales", hint: "Points a seller can earn from how many sales they finished.", step: "5", format: (v) => `${v} points` },
  trust_weight_rating: { label: "Trust: buyer ratings", hint: "Points a seller can earn from their average review rating.", step: "5", format: (v) => `${v} points` },
  trust_weight_completion: { label: "Trust: orders seen through", hint: "Points for finishing orders instead of cancelling them.", step: "5", format: (v) => `${v} points` },
  trust_weight_disputes: { label: "Trust: clean record", hint: "Points kept when buyers report no problems.", step: "5", format: (v) => `${v} points` },
  trust_sales_target: { label: "Trust: sales for full marks", hint: "Completed sales needed to earn all the sales points.", step: "5", format: (v) => `${v} sales` },
  trust_tier_rising: { label: "Trust: Rising badge at", hint: "Score a seller needs to be called Rising.", step: "5", format: (v) => `${v}/100` },
  trust_tier_trusted: { label: "Trust: Trusted badge at", hint: "Score a seller needs to be called Trusted.", step: "5", format: (v) => `${v}/100` },
  trust_tier_top: { label: "Trust: Top Seller badge at", hint: "Score a seller needs to be called Top Seller.", step: "5", format: (v) => `${v}/100` },
};

function SettingsTab() {
  const toast = useToast();
  const { data, isLoading } = usePlatformSettings(true);
  const update = useUpdateSetting();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  if (isLoading) return <ListSkeleton rows={3} />;
  if (!data?.length) return <EmptyState title="No settings" body="Platform settings appear here." />;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {data.map((s) => {
        const meta = SETTING_META[s.key] ?? { label: s.key.replace(/_/g, " "), hint: s.description ?? "", step: "1", format: (v: number) => String(v) };
        const current = Number(s.value);
        const draft = drafts[s.key] ?? String(current);
        const changed = Number(draft) !== current;
        return (
          <div key={s.key} className="panel p-5">
            <div className="flex items-start gap-3">
              <span className="icon-tile h-10 w-10 rounded-xl">
                <Settings2 size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{meta.label}</p>
                <p className="text-sm text-muted-foreground">{meta.hint}</p>
                <p className="mt-1 text-sm">Currently {meta.format(current)}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <input type="number" min={0} step={meta.step} className="input flex-1" aria-label={meta.label} value={draft} onChange={(e) => setDrafts({ ...drafts, [s.key]: e.target.value })} />
              <button
                className="btn btn-primary"
                disabled={!changed || update.isPending || Number.isNaN(Number(draft))}
                onClick={() => update.mutate({ key: s.key, value: Number(draft) }, { onSuccess: () => toast.success("Saved"), onError: (e) => toast.error(e.message) })}
              >
                Save
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Last changed {formatDate(s.updated_at)}</p>
          </div>
        );
      })}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="panel flex items-start gap-4 p-5">
      <span className="icon-tile h-11 w-11 rounded-2xl">
        <Icon size={18} />
      </span>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 font-heading text-[24px] font-extrabold leading-none">{value}</p>
      </div>
    </div>
  );
}
