import { useEffect, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRecentOrders } from "@/hooks/useOrders";
import { useConversations, useUnreadCount } from "@/hooks/useMessages";
import { useCheckIn } from "@/hooks/useCheckIn";
import { useToast } from "@/components/shared/Toast";
import { Page } from "@/components/layout/PageLayout";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ListSkeleton, StatSkeleton } from "@/components/shared/SkeletonLoader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Avatar } from "@/components/shared/Avatar";
import { DashboardFeed } from "@/components/feed/DashboardFeed";
import { formatDate, formatRelative, truncate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — PlugZone" }] }),
  component: DashboardPage,
});

function useDashboardCounts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dashboard", "counts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [ads, pending] = await Promise.all([
        supabase.from("ads").select("id", { count: "exact", head: true }).eq("seller_id", user!.id).eq("status", "active"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("seller_id", user!.id).eq("status", "pending"),
      ]);
      return { activeAds: ads.count ?? 0, pendingOrders: pending.count ?? 0 };
    },
  });
}

function DashboardPage() {
  const { profile, user } = useAuth();
  const toast = useToast();
  const counts = useDashboardCounts();
  const unread = useUnreadCount();
  const orders = useRecentOrders(5);
  const convos = useConversations();
  const checkIn = useCheckIn();
  const attempted = useRef(false);

  // Daily streak logic on arrival after login
  useEffect(() => {
    if (!profile || attempted.current) return;
    const today = format(new Date(), "yyyy-MM-dd");
    if (profile.last_check_in === today) return;
    attempted.current = true;
    checkIn.mutate(undefined, {
      onSuccess: (r) => {
        if (!r.already_checked_in) toast.success(`Checked in — ${r.current_streak} day streak!`);
      },
    });
  }, [profile, checkIn, toast]);

  const stats = [
    { label: "Active ads", value: counts.data?.activeAds, to: "/ads" as const },
    { label: "Pending orders", value: counts.data?.pendingOrders, to: "/orders" as const },
    { label: "Unread messages", value: unread.data, to: "/messages" as const },
    { label: "Current streak", value: profile ? `${profile.current_streak} ${profile.current_streak === 1 ? "day" : "days"}` : undefined, to: "/checkin" as const },
  ];

  return (
    <Page wide>
      <div>
        <h1 className="text-2xl sm:text-3xl">Welcome back, {profile?.display_name ?? "there"}</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">{format(new Date(), "EEEE, d MMMM yyyy")}</p>
      </div>

      <section className="mt-8">
        {counts.isLoading ? (
          <StatSkeleton />
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-1 hide-scrollbar">
            {stats.map((s) => (
              <Link key={s.label} to={s.to} className="panel min-w-[180px] flex-1 p-5 transition-colors hover:border-foreground">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="mt-1 font-heading text-3xl font-bold">{s.value ?? "—"}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <DashboardFeed />

      <section className="mt-12">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl">Recent orders</h2>
          <Link to="/orders" className="text-[15px] font-medium text-primary">
            View all orders
          </Link>
        </div>
        <div className="mt-4">
          {orders.isLoading ? (
            <ListSkeleton rows={3} />
          ) : !orders.data?.length ? (
            <EmptyState title="No orders yet" body="Orders you place or receive will show up here." />
          ) : (
            <ul className="divide-y border-y">
              {orders.data.map((o) => {
                const other = o.buyer_id === user?.id ? o.seller : o.buyer;
                return (
                  <li key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3.5">
                    <Link to="/ad/$adId" params={{ adId: o.ad_id }} className="min-w-0 flex-1 basis-48 truncate font-medium hover:text-primary">
                      {o.ad.title}
                    </Link>
                    <span className="text-[15px] text-muted-foreground">
                      {o.buyer_id === user?.id ? "from" : "to"} @{other.username}
                    </span>
                    <StatusBadge status={o.status} />
                    <span className="text-sm text-muted-foreground">{formatDate(o.created_at)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl">Recent messages</h2>
          <Link to="/messages" className="text-[15px] font-medium text-primary">
            View all messages
          </Link>
        </div>
        <div className="mt-4">
          {convos.isLoading ? (
            <ListSkeleton rows={3} />
          ) : !convos.data?.length ? (
            <EmptyState title="No conversations yet" body="Message a seller from any ad to start chatting." />
          ) : (
            <ul className="divide-y border-y">
              {convos.data.slice(0, 3).map((c) => (
                <li key={c.id}>
                  <Link to="/messages" search={{ c: c.id }} className="flex items-center gap-3 py-3.5">
                    <Avatar name={c.other.display_name} username={c.other.username} src={c.other.avatar_url} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{c.other.display_name}</p>
                      <p className="truncate text-[15px] text-muted-foreground">{c.lastMessage ? truncate(c.lastMessage.content, 60) : "No messages yet"}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">{formatRelative(c.last_message_at)}</span>
                    {c.unread > 0 && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </Page>
  );
}
