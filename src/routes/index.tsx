import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PublicHeader, PublicFooter } from "@/components/layout/PageLayout";
import { Logo } from "@/components/layout/TopNav";
import { ArrowRight, MessageSquare, ShieldCheck, Zap } from "lucide-react";
import { Skeleton } from "@/components/shared/SkeletonLoader";
import { useRecentAds } from "@/hooks/useAds";
import { formatPrice } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PlugZone | BUY.SELL.CONNECT" },
      { name: "description", content: "Post ads, receive orders, chat with buyers in real time, add friends, and buy data bundles. PlugZone is a peer-to-peer marketplace." },
      { property: "og:title", content: "PlugZone — Buy and sell directly, no middleman" },
      { property: "og:description", content: "Post ads, receive orders, chat with buyers, and buy data bundles on PlugZone." },
    ],
    links: [{ rel: "preload", as: "image", href: "/plugzone-mark.png", fetchPriority: "high" }],
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
    <div className="min-h-screen overflow-x-hidden">
      <PublicHeader
        right={
          <nav className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link to="/login" className="btn btn-ghost btn-sm">
              Sign in
            </Link>
            <Link to="/signup" className="btn btn-primary btn-sm">
              <span className="sm:hidden">Sign up</span>
              <span className="hidden sm:inline">Create Account</span>
            </Link>
          </nav>

        }
      />

      <section className="hero-surface border-b">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:gap-12 lg:px-8 lg:pb-28 lg:pt-24">
        <div className="rise-in min-w-0">
          <Logo to="/" size="lg" />
          <span className="pill mb-5 mt-5 block w-fit sm:mb-6 sm:mt-6">Peer-to-peer digital marketplace</span>
          <h1 className="max-w-2xl text-balance text-[34px] leading-[1.05] sm:text-[56px] sm:leading-[1.02] lg:text-[72px]">Buy and sell directly, no middleman.</h1>
          <p className="mt-5 max-w-lg text-pretty text-base text-muted-foreground sm:mt-6 sm:text-xl">Post an ad, get orders from real people, and close the deal in chat — with payments held safely until it's done.</p>
          <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
            <Link to="/signup" className="btn btn-primary btn-lg w-full justify-center sm:w-auto">
              Create Account <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn btn-secondary btn-lg w-full justify-center sm:w-auto">
              Sign in
            </Link>
          </div>
        </div>
        <dl className="panel grid min-w-0 grid-cols-3 divide-x overflow-hidden lg:grid-cols-1 lg:divide-x-0 lg:divide-y">
          {[
            { label: "Members", value: stats?.total_users },
            { label: "Ads posted", value: stats?.total_ads },
            { label: "Orders completed", value: stats?.completed_orders },
          ].map((s) => (
            <div key={s.label} className="min-w-0 p-4 sm:p-5 lg:flex lg:items-baseline lg:justify-between lg:px-7 lg:py-6">
              <dt className="text-xs text-muted-foreground sm:text-sm">{s.label}</dt>
              <dd className="mt-1 font-heading text-xl font-bold sm:text-2xl lg:mt-0 lg:text-3xl">{isLoading ? <Skeleton className="h-7 w-14" /> : n(s.value)}</dd>
            </div>
          ))}
        </dl>
      </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <h2 className="text-2xl sm:text-4xl">How it works</h2>
        <ol className="mt-8 grid gap-4 sm:mt-10 md:grid-cols-3">
          {[
            { icon: Zap, t: "Post your ad", d: "Add photos, pricing and details in about a minute." },
            { icon: MessageSquare, t: "Get orders and chat", d: "Buyers find you, make offers and talk to you in real time." },
            { icon: ShieldCheck, t: "Close the deal safely", d: "Payment is tracked on every order and earnings land in your wallet." },
          ].map((step, i) => (
            <li key={step.t} className="panel p-5 sm:p-7">
              <div className="flex items-center justify-between">
                <span className="icon-tile h-11 w-11 rounded-2xl sm:h-12 sm:w-12">
                  <step.icon size={20} />
                </span>
                <span className="font-heading text-sm font-bold text-muted-foreground">0{i + 1}</span>
              </div>
              <h3 className="mt-5 text-lg sm:mt-6 sm:text-xl">{step.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground sm:text-[15px]">{step.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {ads && ads.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-2xl sm:text-4xl">Latest ads</h2>
            <Link to="/signup" className="text-sm font-medium text-primary sm:text-[15px]">
              Sign up to see more
            </Link>
          </div>
          <div className="mt-6 flex gap-3 overflow-x-auto pb-2 hide-scrollbar sm:gap-4">
            {ads.map((ad) => (
              <Link key={ad.id} to="/ad/$adId" params={{ adId: ad.id }} className="panel w-52 shrink-0 overflow-hidden transition-transform hover:-translate-y-0.5 sm:w-64">
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

      <section className="hero-surface border-y">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-4 gap-y-6 px-4 py-10 sm:grid-cols-3 sm:px-6 sm:py-12 md:grid-cols-5 lg:px-8">
          {[
            { v: stats?.total_ads, l: "ads posted" },
            { v: stats?.completed_orders, l: "completed orders" },
            { v: stats?.total_messages, l: "messages sent" },
            { v: stats?.total_checkins, l: "daily check-ins" },
            { v: stats?.total_users, l: "members" },
          ].map((s) => (
            <div key={s.l} className="min-w-0">
              <p className="font-heading text-xl font-extrabold sm:text-2xl">{isLoading ? "…" : `${n(s.v)}`}</p>
              <p className="text-xs text-muted-foreground sm:text-sm">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
