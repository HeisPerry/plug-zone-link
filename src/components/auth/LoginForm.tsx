import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { loginSchema } from "@/lib/validators";
import { Field } from "@/components/shared/Field";
import { useToast } from "@/components/shared/Toast";

const MAX_ATTEMPTS = 5;
const LOCK_SECONDS = 30;

export function LoginForm() {
  const navigate = useNavigate();
  const toast = useToast();
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [resetMode, setResetMode] = useState(false);

  useEffect(() => {
    if (!lockedUntil) return;
    const t = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= lockedUntil) {
        setLockedUntil(null);
        setAttempts(0);
      }
    }, 500);
    return () => clearInterval(t);
  }, [lockedUntil]);

  const locked = lockedUntil !== null && now < lockedUntil;
  const secondsLeft = locked ? Math.ceil((lockedUntil! - now) / 1000) : 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return;
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      const errs: typeof errors = {};
      parsed.error.issues.forEach((i) => {
        const k = i.path[0] as "email" | "password";
        if (!errs[k]) errs[k] = i.message;
      });
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setSubmitting(false);
    if (error) {
      const next = attempts + 1;
      setAttempts(next);
      if (next >= MAX_ATTEMPTS) {
        setLockedUntil(Date.now() + LOCK_SECONDS * 1000);
        setErrors({ form: `Too many failed attempts. Try again in ${LOCK_SECONDS} seconds.` });
      } else {
        setErrors({ form: error.message === "Invalid login credentials" ? "Wrong email or password." : error.message });
      }
      return;
    }
    // Daily streak logic runs from the dashboard on arrival.
    navigate({ to: "/dashboard" });
  }

  async function sendReset(e: React.FormEvent) {
    e.preventDefault();
    const email = values.email.trim();
    if (!email) {
      setErrors({ email: "Enter your email first" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setSubmitting(false);
    if (error) setErrors({ form: error.message });
    else {
      toast.success("Password reset email sent");
      setResetMode(false);
    }
  }

  if (resetMode) {
    return (
      <form onSubmit={sendReset} noValidate className="space-y-5">
        <div>
          <h2 className="text-2xl">Reset your password</h2>
          <p className="mt-1 text-[15px] text-muted-foreground">We'll email you a link to set a new one.</p>
        </div>
        <Field label="Email" htmlFor="email" error={errors.email}>
          <input id="email" type="email" className="input" value={values.email} onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))} autoComplete="email" />
        </Field>
        {errors.form && <p className="field-error">{errors.form}</p>}
        <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
          {submitting ? "Sending…" : "Send Reset Link"}
        </button>
        <button type="button" className="text-[15px] font-medium text-primary" onClick={() => setResetMode(false)}>
          Back to sign in
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div>
        <h2 className="text-2xl">Sign in</h2>
        <p className="mt-1 text-[15px] text-muted-foreground">Welcome back.</p>
      </div>
      <Field label="Email" htmlFor="email" error={errors.email}>
        <input id="email" type="email" className="input" value={values.email} onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))} autoComplete="email" />
      </Field>
      <div>
        <Field label="Password" htmlFor="password" error={errors.password}>
          <input id="password" type="password" className="input" value={values.password} onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))} autoComplete="current-password" />
        </Field>
        <button type="button" className="mt-2 text-sm font-medium text-primary" onClick={() => setResetMode(true)}>
          Forgot password?
        </button>
      </div>
      {errors.form && <p className="field-error">{locked ? `Too many failed attempts. Try again in ${secondsLeft}s.` : errors.form}</p>}
      <button type="submit" className="btn btn-primary w-full" disabled={submitting || locked}>
        {locked ? `Wait ${secondsLeft}s` : submitting ? "Signing in…" : "Sign In"}
      </button>
      <p className="text-[15px] text-muted-foreground">
        New here?{" "}
        <Link to="/signup" className="font-medium text-primary">
          Create an account
        </Link>
      </p>
    </form>
  );
}
