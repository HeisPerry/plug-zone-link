import { createFileRoute } from "@tanstack/react-router";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { reset?: boolean } =>
    search["reset"] === true || search["reset"] === "true" ? { reset: true } : {},
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
  const { reset } = Route.useSearch();
  return (
    <AuthLayout
      headline="Your ads, orders and messages in one place."
      points={["Pick up conversations where you left off", "Accept or complete pending orders", "Keep your daily check-in streak alive"]}
    >
      <LoginForm initialResetMode={!!reset} />
    </AuthLayout>
  );
}
