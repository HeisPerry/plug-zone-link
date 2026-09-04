import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { ArrowLeft, Check, CheckCheck, Download, FileText, Paperclip, Send, ShoppingBag, X } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { MAX_ATTACHMENT_BYTES, useConversation, useConversations, useSendMessage, useThread } from "@/hooks/useMessages";
import { useIsOnline, useLastSeen, useTyping } from "@/hooks/usePresence";
import { useUserActiveAds } from "@/hooks/useAds";
import { usePlaceOrder } from "@/hooks/useOrders";
import { Avatar } from "@/components/shared/Avatar";
import { EmptyState } from "@/components/shared/EmptyState";
import { Field } from "@/components/shared/Field";
import { Modal } from "@/components/shared/Modal";
import { ListSkeleton, Skeleton } from "@/components/shared/SkeletonLoader";
import { useToast } from "@/components/shared/Toast";
import { cn, formatPrice, formatRelative, timeAgo, truncate } from "@/lib/utils";
import type { Ad, Message, ProfileLite } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/messages")({
  validateSearch: z.object({ c: z.string().uuid().optional() }),
  head: () => ({ meta: [{ title: "Messages — PlugZone" }] }),
  component: MessagesPage,
});

function MessagesPage() {
  const { c: activeId } = Route.useSearch();
  const navigate = useNavigate();
  const { data: convos, isLoading } = useConversations();
  const listed = convos?.find((x) => x.id === activeId) ?? null;
  // A conversation opened straight from an ad may not be in the cached list yet — fetch it directly.
  const { data: direct, isLoading: directLoading } = useConversation(!listed && activeId ? activeId : undefined);
  const active = listed ?? direct ?? null;

  const select = (id: string | undefined) => navigate({ to: "/messages", search: id ? { c: id } : {}, replace: false });

  return (
    <div className="-mb-24 flex h-[calc(100dvh-64px-4rem)] lg:-mb-12 lg:h-[calc(100dvh-73px)]">
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
        ) : activeId && (isLoading || directLoading) ? (
          <div className="p-6">
            <Skeleton className="h-6 w-40" />
          </div>
        ) : activeId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="text-[15px] text-muted-foreground">This conversation could not be found.</p>
            <button className="btn btn-secondary btn-sm" onClick={() => select(undefined)}>
              Back to all conversations
            </button>
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

function messageStatus(m: Message): "Sent" | "Delivered" | "Read" {
  if (m.read || m.read_at) return "Read";
  if (m.delivered_at) return "Delivered";
  return "Sent";
}

function formatBytes(n: number | null) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function Attachment({ m }: { m: Message }) {
  if (!m.attachment_url) return null;
  const isImage = (m.attachment_type ?? "").startsWith("image/");
  if (isImage) {
    return (
      <a href={m.attachment_url} target="_blank" rel="noreferrer" className="block">
        <img src={m.attachment_url} alt={m.attachment_name ?? "Image"} loading="lazy" className="max-h-72 w-auto max-w-full rounded-md border object-cover" />
      </a>
    );
  }
  return (
    <a href={m.attachment_url} target="_blank" rel="noreferrer" download={m.attachment_name ?? undefined} className="flex items-center gap-3 rounded-md border bg-background/60 px-3 py-2 hover:bg-background">
      <span className="icon-tile shrink-0">
        <FileText size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium">{m.attachment_name ?? "File"}</span>
        <span className="block text-xs text-muted-foreground">{formatBytes(m.attachment_size)}</span>
      </span>
      <Download size={16} className="shrink-0 text-muted-foreground" />
    </a>
  );
}

function Thread({ conversationId, other, onBack }: { conversationId: string; other: ProfileLite; onBack: () => void }) {
  const { user } = useAuth();
  const toast = useToast();
  const { data: messages, isLoading } = useThread(conversationId);
  const send = useSendMessage(conversationId, other.id);
  const { othersTyping, sendTyping } = useTyping(conversationId);
  const online = useIsOnline(other.id);
  const { data: lastSeen } = useLastSeen(other.id, online);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [ordering, setOrdering] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages?.length, othersTyping]);

  useEffect(() => () => {
    if (stopTimer.current) clearTimeout(stopTimer.current);
  }, []);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function onType(value: string) {
    setText(value);
    if (value.trim()) {
      sendTyping(true);
      if (stopTimer.current) clearTimeout(stopTimer.current);
      stopTimer.current = setTimeout(() => sendTyping(false), 2500);
    } else {
      sendTyping(false);
    }
  }

  function pickFile(f: File | null) {
    if (!f) return;
    if (f.size > MAX_ATTACHMENT_BYTES) {
      toast.error("Files must be 20 MB or smaller");
      return;
    }
    setFile(f);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content && !file) return;
    const outgoing = { content, file };
    setText("");
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
    if (stopTimer.current) clearTimeout(stopTimer.current);
    sendTyping(false);
    send.mutate(outgoing, {
      onError: (err) => {
        setText(content);
        setFile(outgoing.file);
        toast.error(err.message);
      },
    });
  }

  // Only the last message I sent carries a status label, to keep the thread quiet.
  const lastMineId = [...(messages ?? [])].reverse().find((m) => m.sender_id === user?.id)?.id;

  return (
    <>
      <header className="flex items-center gap-3 border-b px-4 py-3 sm:px-6">
        <button onClick={onBack} className="-ml-2 flex h-11 w-11 items-center justify-center md:hidden" aria-label="Back to conversations">
          <ArrowLeft size={20} />
        </button>
        <Link to="/user/$username" params={{ username: other.username }} className="relative">
          <Avatar name={other.display_name} username={other.username} src={other.avatar_url} size={36} />
          {online && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-primary" aria-hidden="true" />}
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium leading-tight">{other.display_name}</p>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {othersTyping ? <span className="text-primary">Typing...</span> : online ? "Online" : lastSeen ? `Last seen ${timeAgo(lastSeen)}` : "Offline"}
          </p>
        </div>
        <button className="btn btn-secondary btn-sm shrink-0" onClick={() => setOrdering(true)}>
          <ShoppingBag size={15} /> <span className="hidden sm:inline">Create order</span>
          <span className="sm:hidden">Order</span>
        </button>
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
              const hideText = !!m.attachment_url && m.content.startsWith("Sent a file: ");
              return (
                <li key={m.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
                  <div className={cn("max-w-[78%] rounded-lg px-3.5 py-2 text-[15px]", mine ? "bg-primary-soft" : "bg-muted border")}>
                    {m.attachment_url && (
                      <div className={cn(!hideText && "mb-2")}>
                        <Attachment m={m} />
                      </div>
                    )}
                    {!hideText && <p className="whitespace-pre-line break-words">{m.content}</p>}
                    <p className="mt-0.5 text-right text-[11px] text-muted-foreground">{format(new Date(m.created_at), "HH:mm")}</p>
                  </div>
                  {mine && m.id === lastMineId && (
                    <span className={cn("mt-1 flex items-center gap-1 text-[11px]", messageStatus(m) === "Read" ? "text-primary" : "text-muted-foreground")}>
                      {messageStatus(m) === "Sent" ? <Check size={12} /> : <CheckCheck size={12} />}
                      {messageStatus(m)}
                    </span>
                  )}
                </li>
              );
            })}
            {othersTyping && (
              <li className="flex justify-start">
                <div className="rounded-lg border bg-muted px-3.5 py-2 text-[13px] text-muted-foreground">Typing...</div>
              </li>
            )}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={submit} className="border-t p-3 sm:p-4">
        {file && (
          <div className="mb-2 flex items-center gap-3 rounded-md border bg-muted px-3 py-2">
            {preview ? <img src={preview} alt="" className="h-12 w-12 rounded object-cover" /> : <FileText size={20} className="text-muted-foreground" />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
            </div>
            <button
              type="button"
              className="icon-btn"
              aria-label="Remove attachment"
              onClick={() => {
                setFile(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            className="sr-only"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.csv"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            tabIndex={-1}
          />
          <button type="button" className="icon-btn shrink-0" aria-label="Attach a file" onClick={() => fileRef.current?.click()} disabled={send.isPending}>
            <Paperclip size={18} />
          </button>
          <input className="input" placeholder="Write a message" value={text} onChange={(e) => onType(e.target.value)} maxLength={2000} aria-label="Message" />
          <button type="submit" className="btn btn-primary shrink-0" disabled={(!text.trim() && !file) || send.isPending}>
            <Send size={16} /> {send.isPending ? "Sending…" : "Send"}
          </button>
        </div>
      </form>

      <CreateOrderModal open={ordering} onClose={() => setOrdering(false)} other={other} conversationId={conversationId} />
    </>
  );
}

function CreateOrderModal({ open, onClose, other, conversationId }: { open: boolean; onClose: () => void; other: ProfileLite; conversationId: string }) {
  const toast = useToast();
  const navigate = useNavigate();
  const { data: ads, isLoading } = useUserActiveAds(open ? other.id : undefined);
  const place = usePlaceOrder();
  const send = useSendMessage(conversationId, other.id);
  const [adId, setAdId] = useState<string>("");
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");

  const ad: Ad | undefined = ads?.find((a) => a.id === adId) ?? ads?.[0];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ad) return;
    place.mutate(
      { adId: ad.id, sellerId: ad.seller_id, quantity: qty, unitPrice: Number(ad.price), notes },
      {
        onSuccess: () => {
          send.mutate({ content: `Order placed: "${ad.title}" × ${qty} — ${formatPrice(Number(ad.price) * qty, ad.currency)}${notes.trim() ? `\n${notes.trim()}` : ""}` });
          toast.success("Order placed");
          onClose();
          navigate({ to: "/orders" });
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  return (
    <Modal open={open} onClose={onClose} title={`Order from ${other.display_name}`}>
      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : !ads?.length ? (
        <div className="space-y-4">
          <p className="text-[15px] text-muted-foreground">{other.display_name} has no active ads to order from right now.</p>
          <Link to="/user/$username" params={{ username: other.username }} className="btn btn-secondary">
            View profile
          </Link>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          <Field label="Which ad?" htmlFor="order-ad">
            <select id="order-ad" className="input" value={ad?.id ?? ""} onChange={(e) => setAdId(e.target.value)}>
              {ads.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} — {formatPrice(Number(a.price), a.currency)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Quantity" htmlFor="order-qty">
            <input id="order-qty" type="number" min={1} max={99} className="input" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} />
          </Field>
          <Field label="Note to seller (optional)" htmlFor="order-notes">
            <textarea id="order-notes" className="input min-h-[90px]" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery details, preferred time…" />
          </Field>
          {ad && (
            <div className="flex items-center justify-between border-t pt-4">
              <span className="text-[15px] text-muted-foreground">Total</span>
              <span className="font-heading text-xl font-bold">{formatPrice(Number(ad.price) * qty, ad.currency)}</span>
            </div>
          )}
          <button type="submit" className="btn btn-primary w-full" disabled={!ad || place.isPending}>
            {place.isPending ? "Placing order…" : "Confirm Order"}
          </button>
        </form>
      )}
    </Modal>
  );
}
