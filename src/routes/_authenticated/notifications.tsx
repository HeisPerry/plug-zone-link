import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCheck } from "lucide-react";
import { Page, PageHero } from "@/components/layout/PageLayout";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications, useUnreadNotifications } from "@/hooks/useNotifications";
import { ListSkeleton } from "@/components/shared/SkeletonLoader";
import { EmptyState, ErrorState } from "@/components/shared/EmptyState";
import { notificationMeta } from "@/lib/notifications";
import { cn, timeAgo } from "@/lib/utils";
import type { Notification } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — PlugZone" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { data, isLoading, isError, refetch } = useNotifications();
  const { data: unread = 0 } = useUnreadNotifications();
  const markAll = useMarkAllNotificationsRead();

  return (
    <>
      <PageHero
        compact
        eyebrow="Notifications"
        title="Stay in the loop"
        subtitle={unread ? `${unread} unread` : "You're all caught up"}
        action={
          <button className="btn btn-secondary" onClick={() => markAll.mutate()} disabled={!unread || markAll.isPending}>
            <CheckCheck size={16} /> Mark All as Read
          </button>
        }
      />
    <Page>
      <div>
        {isLoading ? (
          <ListSkeleton rows={6} />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !data?.length ? (
          <EmptyState
            title="No notifications yet"
            body="Messages, offers, orders, friend requests and payments will show up here."
            action={
              <Link to="/settings" className="btn btn-secondary btn-sm">
                Notification Settings
              </Link>
            }
          />
        ) : (
          <ul className="panel divide-y overflow-hidden px-5">
            {data.map((n) => (
              <NotificationRow key={n.id} n={n} />
            ))}
          </ul>
        )}
      </div>
    </Page>
    </>
  );
}

function NotificationRow({ n }: { n: Notification }) {
  const navigate = useNavigate();
  const markRead = useMarkNotificationRead();
  const { icon: Icon, label } = notificationMeta(n.type);
  const unread = !n.read_at;

  function open() {
    if (unread) markRead.mutate(n.id);
    if (n.link) navigate({ href: n.link });
  }

  return (
    <li className={cn("flex items-start gap-3 py-3.5", !unread && "opacity-60")}>
      <button onClick={open} className="flex min-w-0 flex-1 items-start gap-3 text-left" aria-label={`${label}: ${n.title}${unread ? " (unread)" : ""}`}>
        <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border", unread ? "border-primary/40 bg-primary-soft text-primary" : "text-muted-foreground")}>
          <Icon size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className={cn("truncate text-[15px]", unread && "font-medium")}>{n.title}</span>
            {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-primary/70" aria-hidden="true" />}
          </span>
          {n.body && <span className="mt-0.5 block truncate text-[14px] text-muted-foreground">{n.body}</span>}
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {label} · <time dateTime={n.created_at}>{timeAgo(n.created_at)}</time>
          </span>
        </span>
      </button>
      {unread && (
        <button className="btn btn-ghost btn-sm shrink-0 text-muted-foreground" onClick={() => markRead.mutate(n.id)} aria-label="Mark as read">
          Mark read
        </button>
      )}
    </li>
  );
}
