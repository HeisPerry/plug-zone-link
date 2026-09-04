import { createFileRoute } from "@tanstack/react-router";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — PlugZone" },
      { name: "description", content: "Sign in to PlugZone to manage your ads, orders, messages, and daily check-in streak." },
      { property: "og:title", content: "Sign in — PlugZone" },
      { property: "og:description", content: "Sign in to manage your ads, orders, and messages." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <AuthLayout
      headline="Your ads, orders and messages in one place."
      points={["Pick up conversations where you left off", "Accept or complete pending orders", "Keep your daily check-in streak alive"]}
    >
      <LoginForm />
    </AuthLayout>
  );
}
