import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Loader2, LinkIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { passwordSchema } from "@/lib/validators";
import { Field } from "@/components/shared/Field";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { Logo } from "@/components/shared/Logo";
import { PublicFooter } from "@/components/layout/PageLayout";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a new password — PlugZone" },
      { name: "description", content: "Choose a new password for your PlugZone account." },
      { property: "og:title", content: "Set a new password — PlugZone" },
      { property: "og:description", content: "Choose a new password for your account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

type Stage = "checking" | "ready" | "invalid" | "done";

function ResetPasswordPage() {
  const [stage, setStage] = useState<Stage>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; form?: string }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);

    // The auth server reports expired / already-used links in the URL itself.
    if (hash.get("error") || query.get("error") || query.get("error_code")) {
      setStage("invalid");
      return;
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) setStage("ready");
    });

    (async () => {
      const code = query.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        setStage(error ? "invalid" : "ready");
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        setStage("ready");
        return;
      }
      // Give the client a moment to consume a token from the URL hash before giving up.
      setTimeout(async () => {
        if (cancelled) return;
        const { data: again } = await supabase.auth.getSession();
        if (!cancelled) setStage(again.session ? "ready" : "invalid");
      }, 2500);
    })();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!passwordSchema.safeParse(password).success) next.password = "Password does not meet all requirements";
    if (password !== confirm) next.confirm = "Passwords do not match";
    setErrors(next);
    if (next.password || next.confirm) return;

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("session") || msg.includes("expired") || msg.includes("jwt")) {
        setStage("invalid");
        return;
      }
      if (msg.includes("different from the old")) {
        setErrors({ password: "Choose a password you haven't used before." });
        return;
      }
      setErrors({ form: "We couldn't update your password. Please try again." });
      return;
    }
    // End the recovery session so the new password is what signs the user in next.
    await supabase.auth.signOut();
    setStage("done");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b px-6 py-4">
        <Link to="/" aria-label="PlugZone home">
          <Logo />
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {stage === "checking" && (
            <div className="flex items-center gap-3 text-[15px] text-muted-foreground" role="status">
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              Checking your reset link…
            </div>
          )}

          {stage === "invalid" && (
            <div className="space-y-5">
              <span className="icon-tile">
                <LinkIcon size={26} aria-hidden="true" />
              </span>
              <div>
                <h1 className="text-3xl">This link has expired</h1>
                <p className="mt-2 text-[15px] text-muted-foreground">
                  Password reset links only work once and expire after a short time. Request a new one and we'll email it to you.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link to="/login" search={{ reset: true }} className="btn btn-primary">
                  Request a New Link
                </Link>
                <Link to="/login" className="btn btn-secondary">
                  Back to Sign In
                </Link>
              </div>
            </div>
          )}

          {stage === "ready" && (
            <form onSubmit={submit} noValidate className="space-y-5" aria-busy={saving}>
              <div>
                <h1 className="text-3xl">Set a new password</h1>
                <p className="mt-2 text-[15px] text-muted-foreground">Choose a strong password you don't use anywhere else.</p>
              </div>
              <Field label="New password" htmlFor="pw" error={errors.password}>
                <PasswordInput
                  id="pw"
                  toggleLabel="new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  aria-invalid={!!errors.password}
                  autoFocus
                />
                <PasswordStrength password={password} />
              </Field>
              <Field label="Confirm new password" htmlFor="pw2" error={errors.confirm}>
                <PasswordInput
                  id="pw2"
                  toggleLabel="confirm password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  aria-invalid={!!errors.confirm}
                />
              </Field>
              {errors.form && (
                <p className="field-error" role="alert">
                  {errors.form}
                </p>
              )}
              <button type="submit" className="btn btn-primary w-full" disabled={saving}>
                {saving && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
                {saving ? "Updating…" : "Update Password"}
              </button>
            </form>
          )}

          {stage === "done" && (
            <div className="space-y-5">
              <span className="icon-tile">
                <CheckCircle2 size={26} aria-hidden="true" />
              </span>
              <div>
                <h1 className="text-3xl">Password updated</h1>
                <p className="mt-2 text-[15px] text-muted-foreground">Your new password is ready. Sign in to pick up where you left off.</p>
              </div>
              <Link to="/login" className="btn btn-primary w-full sm:w-auto">
                Return to Sign In
              </Link>
            </div>
          )}
        </div>
      </main>

      <PublicFooter compact />
    </div>
  );
}
