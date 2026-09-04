import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PublicHeader } from "@/components/layout/PageLayout";
import { Skeleton } from "@/components/shared/SkeletonLoader";
import { useRecentAds } from "@/hooks/useAds";
import { formatPrice } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PlugZone — Buy and sell directly, no middleman" },
      { name: "description", content: "Post ads, receive orders, chat with buyers in real time, add friends, and buy data bundles. PlugZone is a peer-to-peer marketplace." },
      { property: "og:title", content: "PlugZone — Buy and sell directly, no middleman" },
      { property: "og:description", content: "Post ads, receive orders, chat with buyers, and buy data bundles on PlugZone." },
    ],
  }),
  component: LandingPage,
});

function usePublicStats() {
  return useQuery({
    queryKey: ["public-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_stats");
      if (error) throw error;
      return data[0]!;
    },
    staleTime: 60_000,
  });
}

function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data: stats, isLoading } = usePublicStats();
  const { data: ads } = useRecentAds(6);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [user, loading, navigate]);

  const n = (v: number | bigint | undefined) => (v === undefined ? "—" : Number(v).toLocaleString());

  return (
    <div className="min-h-screen">
      <PublicHeader
        right={
          <nav className="flex items-center gap-2">
            <Link to="/login" className="btn btn-ghost btn-sm">
              Sign in
            </Link>
            <Link to="/signup" className="btn btn-primary btn-sm">
              Create Account
            </Link>
          </nav>
        }
      />

      <section className="mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:pb-28 lg:pt-24">
        <div>
          <h1 className="max-w-2xl text-[36px] sm:text-[48px] lg:text-[60px]">Buy and sell directly, no middleman.</h1>
          <p className="mt-5 max-w-lg text-lg text-muted-foreground">Post an ad, get orders from real people nearby, and close the deal in chat.</p>
          <Link to="/signup" className="btn btn-primary btn-lg mt-8">
            Create Account
          </Link>
        </div>
        <dl className="grid grid-cols-3 gap-px border bg-border lg:grid-cols-1">
          {[
            { label: "Members", value: stats?.total_users },
            { label: "Ads posted", value: stats?.total_ads },
            { label: "Orders completed", value: stats?.completed_orders },
          ].map((s) => (
            <div key={s.label} className="bg-background p-5 lg:flex lg:items-baseline lg:justify-between lg:px-6">
              <dt className="text-sm text-muted-foreground">{s.label}</dt>
              <dd className="mt-1 font-heading text-2xl font-bold lg:mt-0 lg:text-3xl">{isLoading ? <Skeleton className="h-8 w-16" /> : n(s.value)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <h2 className="text-2xl sm:text-3xl">How it works</h2>
        <ol className="relative mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
          <div className="absolute left-5 top-0 hidden h-px w-[calc(100%-2.5rem)] bg-border md:block md:top-5" aria-hidden="true" />
          {[
            "Post your ad with photos and pricing.",
            "Buyers find you and place orders.",
            "Chat, finalize, and complete the deal.",
          ].map((step, i) => (
            <li key={step} className="relative flex gap-4 md:block">
              <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-background font-heading text-sm font-bold">
                {i + 1}
              </span>
              <p className="max-w-xs pt-1.5 text-[17px] md:mt-5 md:pt-0">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      {ads && ads.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl sm:text-3xl">Latest ads</h2>
            <Link to="/signup" className="text-[15px] font-medium text-primary">
              Sign up to see more
            </Link>
          </div>
          <div className="mt-6 flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
            {ads.map((ad) => (
              <Link key={ad.id} to="/ad/$adId" params={{ adId: ad.id }} className="panel w-64 shrink-0 overflow-hidden">
                {ad.images[0] ? (
                  <img src={ad.images[0]} alt={ad.title} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center border-b bg-muted text-sm text-muted-foreground">No photo</div>
                )}
                <div className="p-4">
                  <p className="truncate font-medium">{ad.title}</p>
                  <p className="mt-1 text-[15px] text-primary">{formatPrice(ad.price, ad.currency)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="border-y bg-muted">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 md:grid-cols-5">
          {[
            { v: stats?.total_ads, l: "ads posted" },
            { v: stats?.completed_orders, l: "completed orders" },
            { v: stats?.total_messages, l: "messages sent" },
            { v: stats?.total_checkins, l: "daily check-ins" },
            { v: stats?.total_users, l: "members" },
          ].map((s) => (
            <div key={s.l}>
              <p className="font-heading text-xl font-bold">{isLoading ? "…" : `${n(s.v)}`}</p>
              <p className="text-sm text-muted-foreground">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-10 text-sm text-muted-foreground sm:px-6">
        <span className="font-heading font-bold text-foreground">PlugZone</span>
        <nav className="flex flex-wrap gap-6">
          <Link to="/signup">Sign Up</Link>
          <Link to="/login">Login</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
        </nav>
      </footer>
    </div>
  );
}
