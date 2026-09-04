import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isEmailLike, loginSchema } from "@/lib/validators";
import { signInWithUsername } from "@/lib/auth.functions";
import { Field } from "@/components/shared/Field";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { useToast } from "@/components/shared/Toast";

const MAX_ATTEMPTS = 5;
const LOCK_SECONDS = 30;
const INVALID = "Incorrect username/email or password.";

type Errors = { identifier?: string; password?: string; form?: string };

export function LoginForm() {
  const navigate = useNavigate();
  const toast = useToast();
  const usernameSignIn = useServerFn(signInWithUsername);
  const [values, setValues] = useState({ identifier: "", password: "" });
  const [errors, setErrors] = useState<Errors>({});
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
        setErrors({});
      }
    }, 500);
    return () => clearInterval(t);
  }, [lockedUntil]);

  const locked = lockedUntil !== null && now < lockedUntil;
  const secondsLeft = locked ? Math.ceil((lockedUntil! - now) / 1000) : 0;

  function failed(message: string) {
    const next = attempts + 1;
    setAttempts(next);
    if (next >= MAX_ATTEMPTS) {
      setLockedUntil(Date.now() + LOCK_SECONDS * 1000);
      setErrors({ form: `Too many failed attempts. Try again in ${LOCK_SECONDS} seconds.` });
    } else {
      setErrors({ form: message });
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (locked || submitting) return;
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      const errs: Errors = {};
      parsed.error.issues.forEach((i) => {
        const k = i.path[0] as "identifier" | "password";
        if (!errs[k]) errs[k] = i.message;
      });
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitting(true);
    const { identifier, password } = parsed.data;
    try {
      if (isEmailLike(identifier)) {
        const { error } = await supabase.auth.signInWithPassword({ email: identifier, password });
        if (error) {
          failed(error.message === "Invalid login credentials" ? INVALID : error.message);
          return;
        }
      } else {
        const res = await usernameSignIn({ data: { username: identifier, password } });
        if (!res.ok) {
          failed(res.reason === "unconfirmed" ? "Please confirm your email address before signing in." : INVALID);
          return;
        }
        const { error } = await supabase.auth.setSession({ access_token: res.access_token, refresh_token: res.refresh_token });
        if (error) {
          failed(INVALID);
          return;
        }
      }
      // Daily streak logic runs from the dashboard on arrival.
      navigate({ to: "/dashboard" });
    } catch {
      setErrors({ form: "We couldn't sign you in right now. Check your connection and try again." });
    } finally {
      setSubmitting(false);
    }
  }

  async function sendReset(e: React.FormEvent) {
    e.preventDefault();
    const email = values.identifier.trim();
    if (!isEmailLike(email)) {
      setErrors({ identifier: "Enter the email address on your account" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setSubmitting(false);
    if (error) setErrors({ form: error.message });
    else {
      toast.success("Password reset email sent");
      setErrors({});
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
        <Field label="Email" htmlFor="reset-email" error={errors.identifier}>
          <input
            id="reset-email"
            type="email"
            className="input"
            value={values.identifier}
            onChange={(e) => setValues((v) => ({ ...v, identifier: e.target.value }))}
            autoComplete="email"
            inputMode="email"
          />
        </Field>
        {errors.form && <p className="field-error">{errors.form}</p>}
        <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
          {submitting ? "Sending…" : "Send Reset Link"}
        </button>
        <button type="button" className="min-h-11 text-[15px] font-medium text-primary" onClick={() => setResetMode(false)}>
          Back to sign in
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5" aria-busy={submitting}>
      <div>
        <h2 className="text-2xl">Sign in</h2>
        <p className="mt-1 text-[15px] text-muted-foreground">Welcome back.</p>
      </div>

      <Field label="Username or Email" htmlFor="identifier" error={errors.identifier}>
        <input
          id="identifier"
          type="text"
          className="input"
          value={values.identifier}
          onChange={(e) => setValues((v) => ({ ...v, identifier: e.target.value }))}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="yourname or you@example.com"
          aria-invalid={!!errors.identifier}
        />
      </Field>

      <Field label="Password" htmlFor="password" error={errors.password}>
        <PasswordInput
          id="password"
          value={values.password}
          onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
          autoComplete="current-password"
          aria-invalid={!!errors.password}
        />
      </Field>

      <div className="flex justify-end">
        <button
          type="button"
          className="min-h-11 text-[15px] font-medium text-primary"
          onClick={() => {
            setErrors({});
            setResetMode(true);
          }}
        >
          Forgot password?
        </button>
      </div>

      {errors.form && (
        <p className="field-error" role="alert">
          {locked ? `Too many failed attempts. Try again in ${secondsLeft}s.` : errors.form}
        </p>
      )}

      <button type="submit" className="btn btn-primary w-full" disabled={submitting || locked}>
        {submitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
        {locked ? `Wait ${secondsLeft}s` : submitting ? "Signing in…" : "Sign In"}
      </button>

      <p className="text-[15px] text-muted-foreground">
        New here?{" "}
        <Link to="/signup" className="font-medium text-primary">
          Sign up
        </Link>
      </p>
    </form>
  );
}
