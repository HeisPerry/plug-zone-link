import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { passwordSchema } from "@/lib/validators";
import { Field } from "@/components/shared/Field";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { useToast } from "@/components/shared/Toast";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a new password — PlugZone" },
      { name: "description", content: "Choose a new password for your PlugZone account." },
      { property: "og:title", content: "Set a new password — PlugZone" },
      { property: "og:description", content: "Choose a new password for your account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const hasRecovery = window.location.hash.includes("type=recovery");
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data: s }) => {
      if (s.session || hasRecovery) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordSchema.safeParse(password).success) return setError("Password does not meet all requirements");
    if (password !== confirm) return setError("Passwords do not match");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) return setError(error.message);
    toast.success("Password updated");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <form onSubmit={submit} noValidate className="w-full max-w-md space-y-5">
        <h1 className="text-3xl">Set a new password</h1>
        {!ready && <p className="text-[15px] text-muted-foreground">Open this page from the link in your reset email.</p>}
        <Field label="New password" htmlFor="pw" error={error ?? undefined}>
          <input id="pw" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          <PasswordStrength password={password} />
        </Field>
        <Field label="Confirm new password" htmlFor="pw2">
          <input id="pw2" type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        </Field>
        <button type="submit" className="btn btn-primary w-full" disabled={saving || !ready}>
          {saving ? "Saving…" : "Update Password"}
        </button>
      </form>
    </div>
  );
}
