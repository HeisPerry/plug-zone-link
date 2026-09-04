import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Headphones, Mail, MessageCircle, Send } from "lucide-react";
import { Page, PageHero } from "@/components/layout/PageLayout";
import { Field } from "@/components/shared/Field";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/shared/Toast";

export const Route = createFileRoute("/_authenticated/support")({
  head: () => ({ meta: [{ title: "Support Center — PlugZone" }] }),
  component: SupportPage,
});

const SUPPORT_EMAIL = "support@plugzone.app";
const TOPICS = ["Order problem", "Payment or wallet", "Account or login", "Report a listing", "Data & airtime top-up", "Something else"];

const FAQ = [
  { q: "How do I get paid after a sale?", a: "Once the buyer marks the order complete, your earnings appear in your Wallet. Withdrawals open as soon as payouts are connected." },
  { q: "Can I negotiate the price of an ad?", a: "Yes. Open any ad and tap Make an Offer. You and the seller have up to five rounds to agree." },
  { q: "What happens if a seller doesn't deliver?", a: "Open a ticket with the order reference. We pause the payment and step in within a few hours." },
  { q: "How do daily check-ins work?", a: "Check in once a day from the Check-In page to grow your streak and unlock perks." },
];

function SupportPage() {
  const { profile, user } = useAuth();
  const toast = useToast();
  const [topic, setTopic] = useState("");
  const [orderRef, setOrderRef] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<{ topic?: string; message?: string }>({});
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!topic) errs.topic = "Choose a topic";
    if (message.trim().length < 10) errs.message = "Tell us a little more (at least 10 characters)";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const subject = encodeURIComponent(`[${topic}] ${orderRef ? `Order ${orderRef} — ` : ""}${profile?.username ?? ""}`);
    const body = encodeURIComponent(`${message}\n\n—\nUser: @${profile?.username ?? "unknown"} (${user?.email ?? ""})${orderRef ? `\nOrder: ${orderRef}` : ""}`);
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    toast.success("Opening your email app with the ticket ready to send");
  }

  return (
    <>
      <PageHero eyebrow="Support Center" title="We are here for you" subtitle="Get instant help by email or live chat, or submit a ticket and our team will get back to you promptly." />
      <Page wide>
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="space-y-4">
            <a href={`mailto:${SUPPORT_EMAIL}`} className="panel flex items-center gap-5 p-6 transition-transform hover:-translate-y-0.5">
              <span className="icon-tile">
                <Mail size={26} />
              </span>
              <span>
                <span className="block font-heading text-lg font-extrabold">Email Us</span>
                <span className="block text-[15px] text-muted-foreground">{SUPPORT_EMAIL}</span>
              </span>
            </a>
            <Link to="/messages" className="panel flex items-center gap-5 p-6 transition-transform hover:-translate-y-0.5">
              <span className="icon-tile">
                <Headphones size={26} />
              </span>
              <span>
                <span className="block font-heading text-lg font-extrabold">Live Chat</span>
                <span className="block text-[15px] text-muted-foreground">Connect instantly in Messages</span>
              </span>
            </Link>
            <div className="panel p-6">
              <div className="flex items-center gap-3">
                <span className="icon-tile h-11 w-11 rounded-xl">
                  <BookOpen size={20} />
                </span>
                <h2 className="text-lg">Quick answers</h2>
              </div>
              <ul className="mt-4 divide-y">
                {FAQ.map((f, i) => (
                  <li key={f.q}>
                    <button type="button" className="flex w-full items-center justify-between gap-3 py-3 text-left font-semibold" aria-expanded={openFaq === i} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                      {f.q}
                      <span className="text-muted-foreground">{openFaq === i ? "−" : "+"}</span>
                    </button>
                    {openFaq === i && <p className="pb-3 text-[15px] text-muted-foreground">{f.a}</p>}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <form onSubmit={submit} noValidate className="panel p-6 sm:p-8">
            <div className="flex items-start gap-5">
              <span className="icon-tile hidden sm:inline-flex">
                <MessageCircle size={26} />
              </span>
              <div>
                <h2 className="text-[28px] sm:text-[32px]">Submit a ticket</h2>
                <p className="mt-1 text-[15px] text-muted-foreground">Our team typically responds within a few hours.</p>
              </div>
            </div>

            <div className="mt-8 space-y-5">
              <Field label="Subject" htmlFor="topic" error={errors.topic}>
                <select id="topic" className="input" value={topic} onChange={(e) => setTopic(e.target.value)}>
                  <option value="">Select a topic</option>
                  {TOPICS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Order reference (optional)" htmlFor="orderRef" hint="Paste the order ID from your Orders page if this is about a purchase.">
                <input id="orderRef" className="input" value={orderRef} onChange={(e) => setOrderRef(e.target.value)} />
              </Field>
              <Field label="How can we help?" htmlFor="message" error={errors.message}>
                <textarea id="message" rows={6} className="input resize-y" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe what happened and what you'd like us to do." />
              </Field>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <p className="text-sm text-muted-foreground">
                  Sending as <span className="font-semibold text-foreground">@{profile?.username}</span>
                </p>
                <button type="submit" className="btn btn-primary">
                  <Send size={17} /> Send Ticket
                </button>
              </div>
            </div>
          </form>
        </div>
      </Page>
    </>
  );
}
