import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Page, PageHeader } from "@/components/layout/PageLayout";
import { useFriendActions, useFriendGraph, useSearchPeople, type Relationship } from "@/hooks/useFriends";
import { useStartConversation } from "@/hooks/useMessages";
import { useDebounce } from "@/hooks/useDebounce";
import { Avatar } from "@/components/shared/Avatar";
import { ListSkeleton } from "@/components/shared/SkeletonLoader";
import { EmptyState } from "@/components/shared/EmptyState";
import { useToast } from "@/components/shared/Toast";
import type { ProfileLite } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/friends")({
  head: () => ({ meta: [{ title: "Friends — PlugZone" }] }),
  component: FriendsPage,
});

const TABS = [
  { id: "friends", label: "Friends" },
  { id: "requests", label: "Requests" },
  { id: "find", label: "Find People" },
] as const;

function FriendsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("friends");
  const graph = useFriendGraph();

  return (
    <Page>
      <PageHeader title="Friends" />
      <div className="mt-6 flex border-b">
        {TABS.map((t) => (
          <button key={t.id} className="tab" data-active={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
            {t.id === "requests" && graph.data?.incoming.length ? <span className="ml-1.5 text-primary">({graph.data.incoming.length})</span> : null}
          </button>
        ))}
      </div>
      <div className="mt-5">
        {tab === "friends" && <FriendsTab />}
        {tab === "requests" && <RequestsTab />}
        {tab === "find" && <FindTab />}
      </div>
    </Page>
  );
}

function PersonRow({ p, children }: { p: ProfileLite; children?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-3.5">
      <Avatar name={p.display_name} username={p.username} src={p.avatar_url} size={44} />
      <div className="min-w-0 flex-1">
        <Link to="/user/$username" params={{ username: p.username }} className="block truncate font-medium hover:text-primary">
          {p.display_name}
        </Link>
        <p className="text-sm text-muted-foreground">@{p.username}</p>
      </div>
      <div className="flex shrink-0 gap-2">{children}</div>
    </li>
  );
}

function FriendsTab() {
  const { data, isLoading } = useFriendGraph();
  const { remove } = useFriendActions();
  const start = useStartConversation();
  const navigate = useNavigate();
  const toast = useToast();

  if (isLoading) return <ListSkeleton rows={4} />;
  if (!data?.friends.length) return <EmptyState title="You haven't added any friends yet" body="Search for people to connect with." />;
  return (
    <ul className="divide-y border-y">
      {data.friends.map(({ friendshipId, profile }) => (
        <PersonRow key={friendshipId} p={profile}>
          <button className="btn btn-secondary btn-sm" onClick={() => start.mutate(profile.id, { onSuccess: (cid) => navigate({ to: "/messages", search: { c: cid } }) })}>
            Message
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => remove.mutate(friendshipId, { onSuccess: () => toast.success("Friend removed") })}>
            Remove
          </button>
        </PersonRow>
      ))}
    </ul>
  );
}

function RequestsTab() {
  const { data, isLoading } = useFriendGraph();
  const { accept, decline, cancel } = useFriendActions();
  const toast = useToast();

  if (isLoading) return <ListSkeleton rows={3} />;
  if (!data?.incoming.length && !data?.outgoing.length) return <EmptyState title="No pending requests" body="Requests you send or receive will appear here." />;
  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-medium text-muted-foreground">Incoming</p>
        {data.incoming.length ? (
          <ul className="mt-2 divide-y border-y">
            {data.incoming.map(({ request, profile }) => (
              <PersonRow key={request.id} p={profile}>
                <button className="btn btn-primary btn-sm" onClick={() => accept.mutate(request.id, { onSuccess: () => toast.success(`You and ${profile.display_name} are now friends`) })}>
                  Accept
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => decline.mutate(request.id)}>
                  Decline
                </button>
              </PersonRow>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[15px] text-muted-foreground">None right now.</p>
        )}
      </section>
      <section>
        <p className="text-sm font-medium text-muted-foreground">Sent by you</p>
        {data.outgoing.length ? (
          <ul className="mt-2 divide-y border-y">
            {data.outgoing.map(({ request, profile }) => (
              <PersonRow key={request.id} p={profile}>
                <button className="btn btn-secondary btn-sm" onClick={() => cancel.mutate(request.id, { onSuccess: () => toast.success("Request cancelled") })}>
                  Cancel Request
                </button>
              </PersonRow>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[15px] text-muted-foreground">None right now.</p>
        )}
      </section>
    </div>
  );
}

export function RelationshipButton({ rel, userId, className }: { rel: Relationship; userId: string; className?: string }) {
  const { send, accept } = useFriendActions();
  const toast = useToast();
  const base = className ?? "btn btn-sm";
  if (rel.kind === "friends")
    return (
      <button className={`${base} btn-secondary`} disabled>
        Friends
      </button>
    );
  if (rel.kind === "outgoing")
    return (
      <button className={`${base} btn-secondary`} disabled>
        Pending
      </button>
    );
  if (rel.kind === "incoming")
    return (
      <button className={`${base} btn-primary`} onClick={() => accept.mutate(rel.requestId, { onSuccess: () => toast.success("Friend request accepted") })}>
        Accept
      </button>
    );
  return (
    <button className={`${base} btn-primary`} disabled={send.isPending} onClick={() => send.mutate(userId, { onSuccess: () => toast.success("Friend request sent"), onError: (e) => toast.error(e.message) })}>
      Add Friend
    </button>
  );
}

function FindTab() {
  const [term, setTerm] = useState("");
  const debounced = useDebounce(term, 300);
  const results = useSearchPeople(debounced);
  const graph = useFriendGraph();

  return (
    <div>
      <input className="input" placeholder="Search by username" value={term} onChange={(e) => setTerm(e.target.value)} autoFocus />
      <div className="mt-4">
        {debounced.trim().length < 2 ? (
          <p className="text-[15px] text-muted-foreground">Type at least two characters to search.</p>
        ) : results.isLoading ? (
          <ListSkeleton rows={3} />
        ) : !results.data?.length ? (
          <EmptyState title={`No one found for “${debounced}”`} body="Check the spelling or try part of the username." />
        ) : (
          <ul className="divide-y border-y">
            {results.data.map((p) => (
              <PersonRow key={p.id} p={p}>
                {graph.data && <RelationshipButton rel={graph.data.relationshipWith(p.id)} userId={p.id} />}
              </PersonRow>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
