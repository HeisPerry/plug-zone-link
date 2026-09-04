import { createFileRoute } from "@tanstack/react-router";
import { PublicHeader } from "@/components/layout/PageLayout";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — PlugZone" },
      { name: "description", content: "What PlugZone stores about you, why, and how to delete it." },
      { property: "og:title", content: "Privacy Policy — PlugZone" },
      { property: "og:description", content: "What PlugZone stores about you and how to delete it." },
    ],
  }),
  component: () => (
    <div>
      <PublicHeader />
      <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl">Privacy Policy</h1>
        <h2 className="mt-8 text-xl">What we store</h2>
        <p className="mt-2 text-[15px]">Your email, username, display name, the ads and messages you create, order history, check-in dates, and referral link activity.</p>
        <h2 className="mt-8 text-xl">What is public</h2>
        <p className="mt-2 text-[15px]">Your username, display name, bio, and active ads are visible to anyone. Messages, orders, and your email are private.</p>
        <h2 className="mt-8 text-xl">Deleting your data</h2>
        <p className="mt-2 text-[15px]">Delete your account from Settings at any time. This removes your profile, ads, messages, and orders permanently.</p>
      </article>
    </div>
  ),
});
