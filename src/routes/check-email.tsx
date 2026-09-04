import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { MailCheck } from "lucide-react";

export const Route = createFileRoute("/check-email")({
  validateSearch: z.object({ email: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Check your email — PlugZone" },
      { name: "description", content: "Confirm your email address to finish creating your PlugZone account." },
      { property: "og:title", content: "Check your email — PlugZone" },
      { property: "og:description", content: "Confirm your email to finish signing up." },
    ],
  }),
  component: CheckEmailPage,
});

function CheckEmailPage() {
  const { email } = Route.useSearch();
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md">
        <MailCheck size={32} className="text-primary" />
        <h1 className="mt-4 text-3xl">Check your email</h1>
        <p className="mt-3 text-[15px] text-muted-foreground">
          We sent a confirmation link to <span className="font-medium text-foreground">{email ?? "your inbox"}</span>. Click it to activate your account, then sign in.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">Didn't get it? Check your spam folder.</p>
        <Link to="/login" className="btn btn-secondary mt-6">
          Go to sign in
        </Link>
      </div>
    </div>
  );
}
