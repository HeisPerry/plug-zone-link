import { createFileRoute } from "@tanstack/react-router";
import { PublicHeader } from "@/components/layout/PageLayout";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — PlugZone" },
      { name: "description", content: "The rules for using PlugZone: posting ads, placing orders, messaging, and referrals." },
      { property: "og:title", content: "Terms of Service — PlugZone" },
      { property: "og:description", content: "The rules for using PlugZone." },
    ],
  }),
  component: () => (
    <div>
      <PublicHeader />
      <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl">Terms of Service</h1>
        <p className="mt-6 text-[15px] text-muted-foreground">PlugZone connects buyers and sellers directly. We do not hold payments or guarantee any transaction between members.</p>
        <h2 className="mt-8 text-xl">Your account</h2>
        <p className="mt-2 text-[15px]">You are responsible for what you post and for keeping your password private. One account per person.</p>
        <h2 className="mt-8 text-xl">Ads and orders</h2>
        <p className="mt-2 text-[15px]">Only list items or services you can legally sell. Describe them accurately. Orders placed through the platform are agreements between you and the other member.</p>
        <h2 className="mt-8 text-xl">Prohibited use</h2>
        <p className="mt-2 text-[15px]">No fraud, harassment, spam, or illegal goods. Accounts that break these rules are removed.</p>
      </article>
    </div>
  ),
});
