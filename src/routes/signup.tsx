import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { SignUpForm } from "@/components/auth/SignUpForm";

export const Route = createFileRoute("/signup")({
  validateSearch: z.object({ ref: z.string().max(12).optional() }),
  head: () => ({
    meta: [
      { title: "Create an account — PlugZone" },
      { name: "description", content: "Join PlugZone to post ads, receive orders, message buyers, and earn referral rewards." },
      { property: "og:title", content: "Create an account — PlugZone" },
      { property: "og:description", content: "Join PlugZone to post ads, receive orders, and message buyers directly." },
    ],
  }),
  component: SignUpPage,
});

function SignUpPage() {
  const { ref } = Route.useSearch();
  return (
    <AuthLayout
      headline="Sell what you have. Buy what you need. Directly."
      points={["Post ads with photos in under two minutes", "Chat with buyers and sellers in real time", "Earn a streak reward every day you check in", "Top up data and airtime without leaving the app"]}
    >
      <SignUpForm initialReferral={ref} />
    </AuthLayout>
  );
}
