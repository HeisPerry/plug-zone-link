import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { ArrowLeft, Send } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useConversations, useSendMessage, useThread } from "@/hooks/useMessages";
import { Avatar } from "@/components/shared/Avatar";
import { EmptyState } from "@/components/shared/EmptyState";
import { ListSkeleton, Skeleton } from "@/components/shared/SkeletonLoader";
import { cn, formatRelative, truncate } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/messages")({
  validateSearch: z.object({ c: z.string().uuid().optional() }),
  head: () => ({ meta: [{ title: "Messages — PlugZone" }] }),
  component: MessagesPage,
});

function MessagesPage() {
  const { c: activeId } = Route.useSearch();
  const navigate = useNavigate();
  const { data: convos, isLoading } = useConversations();
  const active = convos?.find((x) => x.id === activeId) ?? null;

  const select = (id: string | undefined) => navigate({ to: "/messages", search: id ? { c: id } : {}, replace: false });

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] md:h-dvh">
      <aside className={cn("flex w-full flex-col border-r md:w-80 lg:w-96", activeId && "hidden md:flex")}>
        <div className="border-b px-5 py-4">
          <h1 className="text-2xl">Messages</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="px-5">
              <ListSkeleton rows={6} />
            </div>
          ) : !convos?.length ? (
            <div className="p-5">
              <EmptyState title="No conversations yet" body="Open any ad and press “Message Seller” to start one." />
            </div>
          ) : (
            <ul className="divide-y">
              {convos.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => select(c.id)}
                    className={cn("flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-muted", c.id === activeId && "bg-primary-soft hover:bg-primary-soft")}
                  >
                    <Avatar name={c.other.display_name} username={c.other.username} src={c.other.avatar_url} size={44} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate font-medium">{c.other.display_name}</p>
                        <span className="shrink-0 text-xs text-muted-foreground">{formatRelative(c.last_message_at)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className={cn("truncate text-[14px]", c.unread ? "font-medium" : "text-muted-foreground")}>
                          {c.lastMessage ? truncate(c.lastMessage.content, 60) : "Say hello"}
                        </p>
                        {c.unread > 0 && <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-primary" />}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <section className={cn("flex min-w-0 flex-1 flex-col", !activeId && "hidden md:flex")}>
        {active ? (
          <Thread key={active.id} conversationId={active.id} other={active.other} onBack={() => select(undefined)} />
        ) : activeId && isLoading ? (
          <div className="p-6">
            <Skeleton className="h-6 w-40" />
          </div>
        ) : (
          <div className="hidden flex-1 items-center justify-center p-8 md:flex">
            <p className="text-[15px] text-muted-foreground">Pick a conversation to read it here.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function Thread({ conversationId, other, onBack }: { conversationId: string; other: { id: string; display_name: string; username: string; avatar_url: string | null }; onBack: () => void }) {
  const { user } = useAuth();
  const { data: messages, isLoading } = useThread(conversationId);
  const send = useSendMessage(conversationId, other.id);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages?.length]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setText("");
    send.mutate(content, { onError: () => setText(content) });
  }

  return (
    <>
      <header className="flex items-center gap-3 border-b px-4 py-3 sm:px-6">
        <button onClick={onBack} className="-ml-2 flex h-11 w-11 items-center justify-center md:hidden" aria-label="Back to conversations">
          <ArrowLeft size={20} />
        </button>
        <Avatar name={other.display_name} username={other.username} src={other.avatar_url} size={36} />
        <div className="min-w-0">
          <p className="truncate font-medium leading-tight">{other.display_name}</p>
          <p className="text-sm text-muted-foreground">@{other.username}</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="ml-auto h-10 w-2/5" />
            <Skeleton className="h-10 w-1/3" />
          </div>
        ) : !messages?.length ? (
          <p className="text-[15px] text-muted-foreground">No messages yet. Say hello.</p>
        ) : (
          <ul className="space-y-2">
            {messages.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <li key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[78%] rounded-lg px-3.5 py-2 text-[15px]", mine ? "bg-primary-soft" : "bg-muted border")}>
                    <p className="whitespace-pre-line break-words">{m.content}</p>
                    <p className="mt-0.5 text-right text-[11px] text-muted-foreground">{format(new Date(m.created_at), "HH:mm")}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={submit} className="flex gap-2 border-t p-3 sm:p-4">
        <input className="input" placeholder="Write a message" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} aria-label="Message" />
        <button type="submit" className="btn btn-primary shrink-0" disabled={!text.trim() || send.isPending}>
          <Send size={16} /> Send
        </button>
      </form>
    </>
  );
}
