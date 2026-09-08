import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BadgeCheck, Banknote, ShieldCheck, Store } from "lucide-react";
import { Page, PageHero } from "@/components/layout/PageLayout";
import { Field } from "@/components/shared/Field";
import { useToast } from "@/components/shared/Toast";
import { Skeleton } from "@/components/shared/SkeletonLoader";
import { useBecomeSeller, useSellerEarnings, useSellerProfile } from "@/hooks/useSeller";
import { formatPrice } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/sell")({
  head: () => ({
    meta: [
      { title: "Start selling — PlugZone" },
      { name: "description", content: "Set up your PlugZone seller account, add payout details and start selling digital items with escrow protection." },
      { property: "og:title", content: "Start selling on PlugZone" },
      { property: "og:description", content: "Set up your seller account and get paid safely through escrow." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SellPage,
});

function SellPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { data: seller, isLoading } = useSellerProfile();
  const { data: earnings } = useSellerEarnings();
  const become = useBecomeSeller();

  const [businessName, setBusinessName] = useState("");
  const [about, setAbout] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("bank");
  const [payoutAccountName, setPayoutAccountName] = useState("");
  const [payoutBank, setPayoutBank] = useState("");
  const [payoutAccountNumber, setPayoutAccountNumber] = useState("");

  const submit = () => {
    if (!businessName.trim()) return toast.error("Give your store a name");
    if (!payoutAccountName.trim() || !payoutAccountNumber.trim()) return toast.error("Add the account that should receive your money");
    become.mutate(
      { businessName, about, contactEmail, contactPhone, payoutMethod, payoutAccountName, payoutBank, payoutAccountNumber },
      {
        onSuccess: () => {
          toast.success("Your seller account is ready");
          navigate({ to: "/ads/new" });
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  if (isLoading) {
    return (
      <Page>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-6 h-72 w-full" />
      </Page>
    );
  }

  if (seller) {
    return (
      <>
        <PageHero compact eyebrow="Selling" title={seller.business_name} subtitle="Your seller account is active. Post items and get paid once buyers confirm." />
        <Page>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card icon={BadgeCheck} label="Account status" value={seller.status} />
            <Card icon={Banknote} label="Available to withdraw" value={earnings ? formatPrice(earnings.available, "NGN") : "—"} />
            <Card icon={ShieldCheck} label="Held in escrow" value={earnings ? formatPrice(earnings.escrow_held, "NGN") : "—"} />
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/ads/new" className="btn btn-primary">
              Post an ad
            </Link>
            <Link to="/wallet" className="btn btn-secondary">
              Go to wallet
            </Link>
          </div>
          <section className="panel mt-8 space-y-2 p-5 text-[15px]">
            <h2 className="text-lg">Payout details</h2>
            <p className="text-muted-foreground">
              {seller.payout_method} · {seller.payout_account_name ?? "—"} {seller.payout_bank ? `· ${seller.payout_bank}` : ""}{" "}
              {seller.payout_account_last4 ? `· ends ${seller.payout_account_last4}` : ""}
            </p>
            <p className="text-muted-foreground">We only keep the last four digits of your account number.</p>
          </section>
        </Page>
      </>
    );
  }

  return (
    <>
      <PageHero
        compact
        eyebrow="Selling"
        title="Start selling on PlugZone"
        subtitle="Set up your store once. Buyers pay into escrow, and your money is released when they confirm they got the item."
      />
      <Page>
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <section className="panel space-y-4 p-5">
            <h2 className="text-lg">Your store</h2>
            <Field label="Store name" htmlFor="biz">
              <input id="biz" className="input" maxLength={60} value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Zone Digital Store" />
            </Field>
            <Field label="What do you sell? (optional)" htmlFor="about">
              <textarea id="about" className="input min-h-[90px]" maxLength={400} value={about} onChange={(e) => setAbout(e.target.value)} placeholder="Accounts, subscriptions, gift cards, design work…" />
            </Field>
            <Field label="Contact email (optional)" htmlFor="email">
              <input id="email" type="email" className="input" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            </Field>
            <Field label="Contact phone (optional)" htmlFor="phone">
              <input id="phone" className="input" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </Field>

            <h2 className="pt-2 text-lg">Where should we pay you?</h2>
            <Field label="Payout method" htmlFor="method">
              <select id="method" className="input" value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value)}>
                <option value="bank">Bank transfer</option>
                <option value="mobile_money">Mobile money</option>
              </select>
            </Field>
            <Field label="Account name" htmlFor="acct-name">
              <input id="acct-name" className="input" value={payoutAccountName} onChange={(e) => setPayoutAccountName(e.target.value)} />
            </Field>
            <Field label="Bank or provider" htmlFor="bank">
              <input id="bank" className="input" value={payoutBank} onChange={(e) => setPayoutBank(e.target.value)} />
            </Field>
            <Field label="Account number" htmlFor="acct-no" hint="Only the last four digits are stored.">
              <input id="acct-no" className="input" inputMode="numeric" value={payoutAccountNumber} onChange={(e) => setPayoutAccountNumber(e.target.value)} />
            </Field>

            <button className="btn btn-primary w-full" disabled={become.isPending} onClick={submit}>
              {become.isPending ? "Setting up…" : "Create my seller account"}
            </button>
          </section>

          <aside className="space-y-4">
            <Perk icon={Store} title="One store, many listings" body="Post as many digital items as you like once your store is live." />
            <Perk icon={ShieldCheck} title="Escrow protects both sides" body="Buyers pay upfront, the money is held, and it is released to you when they confirm." />
            <Perk icon={Banknote} title="Withdraw when you want" body="Your available balance shows in your wallet, and you can request a payout any time." />
          </aside>
        </div>
      </Page>
    </>
  );
}

function Card({ icon: Icon, label, value }: { icon: typeof Store; label: string; value: string }) {
  return (
    <div className="panel flex items-start gap-3 p-5">
      <span className="icon-tile h-10 w-10 rounded-xl">
        <Icon size={18} />
      </span>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 font-heading text-[22px] font-extrabold capitalize leading-none">{value}</p>
      </div>
    </div>
  );
}

function Perk({ icon: Icon, title, body }: { icon: typeof Store; title: string; body: string }) {
  return (
    <div className="panel flex items-start gap-3 p-5">
      <span className="icon-tile h-10 w-10 rounded-xl">
        <Icon size={18} />
      </span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-[15px] text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
