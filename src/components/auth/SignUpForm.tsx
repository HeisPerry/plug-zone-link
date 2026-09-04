import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signUpSchema, usernameSchema } from "@/lib/validators";
import { useDebounce } from "@/hooks/useDebounce";
import { Field } from "@/components/shared/Field";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { PasswordStrength } from "./PasswordStrength";
import { clearReferral, readReferral } from "@/hooks/useAffiliate";

type Errors = Partial<Record<"displayName" | "username" | "email" | "password" | "confirmPassword" | "referralCode" | "form", string>>;

export function SignUpForm({ initialReferral }: { initialReferral?: string | undefined }) {
  const navigate = useNavigate();
  const [values, setValues] = useState({
    displayName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    referralCode: initialReferral ?? "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [usernameState, setUsernameState] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const debouncedUsername = useDebounce(values.username, 400);

  useEffect(() => {
    if (!initialReferral) {
      const saved = readReferral();
      if (saved?.code) setValues((v) => ({ ...v, referralCode: saved.code }));
    }
  }, [initialReferral]);

  useEffect(() => {
    if (!debouncedUsername) {
      setUsernameState("idle");
      return;
    }
    if (!usernameSchema.safeParse(debouncedUsername).success) {
      setUsernameState("invalid");
      return;
    }
    let cancelled = false;
    setUsernameState("checking");
    supabase.rpc("is_username_available", { p_username: debouncedUsername }).then(({ data, error }) => {
      if (cancelled) return;
      setUsernameState(error ? "idle" : data ? "available" : "taken");
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedUsername]);

  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = signUpSchema.safeParse(values);
    if (!parsed.success) {
      const errs: Errors = {};
      parsed.error.issues.forEach((i) => {
        const k = i.path[0] as keyof Errors;
        if (!errs[k]) errs[k] = i.message;
      });
      setErrors(errs);
      return;
    }
    if (usernameState === "taken") {
      setErrors({ username: "That username is taken" });
      return;
    }
    setErrors({});
    setSubmitting(true);
    const saved = readReferral();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          username: parsed.data.username.toLowerCase(),
          display_name: parsed.data.displayName,
          referral_code: parsed.data.referralCode || null,
          affiliate_click_id: saved && saved.code === parsed.data.referralCode ? saved.clickId : null,
        },
      },
    });
    setSubmitting(false);
    if (error) {
      setErrors({ form: error.message });
      return;
    }
    clearReferral();
    if (data.session) {
      navigate({ to: "/dashboard" });
    } else {
      navigate({ to: "/check-email", search: { email: parsed.data.email } });
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div>
        <h2 className="text-2xl">Create your account</h2>
        <p className="mt-1 text-[15px] text-muted-foreground">Takes about a minute.</p>
      </div>

      <Field label="Display name" htmlFor="displayName" error={errors.displayName}>
        <input id="displayName" className="input" value={values.displayName} onChange={set("displayName")} autoComplete="name" />
      </Field>

      <Field
        label="Username"
        htmlFor="username"
        error={errors.username ?? (usernameState === "taken" ? "That username is taken" : usernameState === "invalid" && values.username ? "3–20 letters, numbers or underscores" : undefined)}
        hint="This is your public handle."
      >
        <div className="relative">
          <input id="username" className="input pr-10" value={values.username} onChange={set("username")} autoComplete="username" />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
            {usernameState === "checking" && <Loader2 size={16} className="animate-spin text-muted-foreground" />}
            {usernameState === "available" && <Check size={16} className="text-success" />}
            {(usernameState === "taken" || usernameState === "invalid") && <X size={16} className="text-destructive" />}
          </span>
        </div>
      </Field>

      <Field label="Email" htmlFor="email" error={errors.email}>
        <input id="email" type="email" className="input" value={values.email} onChange={set("email")} autoComplete="email" />
      </Field>

      <Field label="Password" htmlFor="password" error={errors.password}>
        <input id="password" type="password" className="input" value={values.password} onChange={set("password")} autoComplete="new-password" />
        <PasswordStrength password={values.password} />
      </Field>

      <Field label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword}>
        <input id="confirmPassword" type="password" className="input" value={values.confirmPassword} onChange={set("confirmPassword")} autoComplete="new-password" />
      </Field>

      <Field label="Referral code (optional)" htmlFor="referralCode" error={errors.referralCode}>
        <input id="referralCode" className="input uppercase" value={values.referralCode} onChange={set("referralCode")} placeholder="7KQ2M9XA" />
      </Field>

      {errors.form && <p className="field-error">{errors.form}</p>}

      <button type="submit" className="btn btn-primary w-full" disabled={submitting || usernameState === "checking"}>
        {submitting ? "Creating account…" : "Create Account"}
      </button>

      <p className="text-[15px] text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-primary">
          Sign in
        </Link>
      </p>
    </form>
  );
}
