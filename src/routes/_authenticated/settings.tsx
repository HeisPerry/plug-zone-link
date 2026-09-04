import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAffiliateStats } from "@/hooks/useAffiliate";
import { uploadAdImage } from "@/hooks/useAds";
import { Page, PageHeader } from "@/components/layout/PageLayout";
import { Field } from "@/components/shared/Field";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { Avatar } from "@/components/shared/Avatar";
import { Modal } from "@/components/shared/Modal";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { useToast } from "@/components/shared/Toast";
import { passwordSchema, profileSchema } from "@/lib/validators";
import type { NotificationPrefs } from "@/lib/types";
import { usePrefs } from "@/hooks/useNotifications";
import { PUSH_CATEGORIES } from "@/lib/notifications";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — PlugZone" }] }),
  component: SettingsPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-t py-10 md:grid-cols-[220px_1fr]">
      <h2 className="text-lg">{title}</h2>
      <div className="max-w-lg space-y-5">{children}</div>
    </section>
  );
}

function SettingsPage() {
  return (
    <Page>
      <PageHeader title="Settings" />
      <div className="mt-8">
        <ProfileSection />
        <AffiliateSection />
        <AccountSection />
        <NotificationsSection />
        <DangerSection />
      </div>
    </Page>
  );
}

function ProfileSection() {
  const { profile, user, refreshProfile } = useAuth();
  const toast = useToast();
  const [values, setValues] = useState({ display_name: "", bio: "", phone_number: "" });
  const [errors, setErrors] = useState<Partial<typeof values>>({});
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) setValues({ display_name: profile.display_name, bio: profile.bio ?? "", phone_number: profile.phone_number ?? "" });
  }, [profile]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = profileSchema.safeParse(values);
    if (!parsed.success) {
      const errs: typeof errors = {};
      parsed.error.issues.forEach((i) => {
        const k = i.path[0] as keyof typeof values;
        if (!errs[k]) errs[k] = i.message;
      });
      setErrors(errs);
      return;
    }
    setErrors({});
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: parsed.data.display_name, bio: parsed.data.bio || null, phone_number: parsed.data.phone_number || null })
      .eq("id", user!.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    await refreshProfile();
    toast.success("Profile saved");
  }

  async function onAvatar(file: File) {
    try {
      const url = await uploadAdImage(user!.id, file);
      const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user!.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Photo updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    }
  }

  if (!profile) return null;
  return (
    <Section title="Profile">
      <div className="flex items-center gap-4">
        <Avatar name={profile.display_name} username={profile.username} src={profile.avatar_url} size={64} />
        <div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}>
            Change Photo
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onAvatar(e.target.files[0])} />
          <p className="mt-1 text-xs text-muted-foreground">JPG or PNG, under 2MB.</p>
        </div>
      </div>
      <form onSubmit={save} className="space-y-5" noValidate>
        <Field label="Display name" htmlFor="display_name" error={errors.display_name}>
          <input id="display_name" className="input" value={values.display_name} onChange={(e) => setValues((v) => ({ ...v, display_name: e.target.value }))} />
        </Field>
        <Field label="Username" htmlFor="username" hint="Usernames can't be changed.">
          <input id="username" className="input" value={`@${profile.username}`} disabled />
        </Field>
        <Field label="Bio" htmlFor="bio" error={errors.bio} counter={`${values.bio.length}/300`}>
          <textarea id="bio" className="input min-h-[90px]" maxLength={300} value={values.bio} onChange={(e) => setValues((v) => ({ ...v, bio: e.target.value }))} />
        </Field>
        <Field label="Saved phone number" htmlFor="phone" error={errors.phone_number} hint="Used to autofill data and airtime purchases.">
          <input id="phone" inputMode="numeric" className="input" placeholder="08012345678" maxLength={11} value={values.phone_number} onChange={(e) => setValues((v) => ({ ...v, phone_number: e.target.value.replace(/\D/g, "") }))} />
        </Field>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save Profile"}
        </button>
      </form>
    </Section>
  );
}

function AffiliateSection() {
  const { profile } = useAuth();
  const { data } = useAffiliateStats();
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const link = `${origin}/join?ref=${profile?.affiliate_code ?? ""}`;

  return (
    <Section title="Your referral link">
      <p className="text-[15px] text-muted-foreground">Anyone who signs up through this link is counted as your referral.</p>
      <div className="flex gap-2">
        <input className="input font-mono text-sm" readOnly value={link} onFocus={(e) => e.target.select()} />
        <button
          type="button"
          className="btn btn-secondary shrink-0"
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copied" : "Copy Link"}
        </button>
      </div>
      <dl className="flex gap-8 pt-2">
        {[
          ["Clicks", data?.clicks],
          ["Sign-ups", data?.signups ?? profile?.total_referrals],
          ["Conversion", data ? `${data.rate}%` : undefined],
        ].map(([l, v]) => (
          <div key={l as string}>
            <dd className="font-heading text-2xl font-bold">{v ?? "—"}</dd>
            <dt className="text-sm text-muted-foreground">{l}</dt>
          </div>
        ))}
      </dl>
    </Section>
  );
}

function AccountSection() {
  const { user } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState(user?.email ?? "");
  const [current, setCurrent] = useState("");
  const [pw, setPw] = useState("");
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<"email" | "pw" | null>(null);

  async function changeEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy("email");
    const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: `${window.location.origin}/settings` });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Check both inboxes to confirm the change");
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordSchema.safeParse(pw).success) return setPwErr("Password does not meet all requirements");
    setPwErr(null);
    setBusy("pw");
    const { error } = await supabase.auth.updateUser({ password: pw, current_password: current } as { password: string });
    setBusy(null);
    if (error) return setPwErr(error.message);
    setPw("");
    setCurrent("");
    toast.success("Password changed");
  }

  return (
    <Section title="Account">
      <form onSubmit={changeEmail} className="space-y-3" noValidate>
        <Field label="Email" htmlFor="email">
          <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <button type="submit" className="btn btn-secondary" disabled={busy === "email" || email === user?.email}>
          {busy === "email" ? "Sending…" : "Change Email"}
        </button>
      </form>
      <form onSubmit={changePassword} className="space-y-3 pt-4" noValidate>
        <Field label="Current password" htmlFor="current">
          <PasswordInput id="current" toggleLabel="current password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
        </Field>
        <Field label="New password" htmlFor="newpw" error={pwErr ?? undefined}>
          <PasswordInput id="newpw" toggleLabel="new password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
          {pw && <PasswordStrength password={pw} />}
        </Field>
        <button type="submit" className="btn btn-secondary" disabled={busy === "pw" || !pw}>
          {busy === "pw" ? "Saving…" : "Change Password"}
        </button>
      </form>
    </Section>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
      <span className="text-[15px]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn("relative h-7 w-12 shrink-0 rounded-full border transition-colors", checked ? "border-primary bg-primary" : "bg-muted")}
      >
        <span className={cn("absolute top-0.5 h-[22px] w-[22px] rounded-full bg-background border transition-transform", checked ? "translate-x-[22px]" : "translate-x-0.5")} />
      </button>
    </label>
  );
}

function NotificationsSection() {
  const { user, refreshProfile } = useAuth();
  const toast = useToast();
  const prefs = usePrefs();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    setPermission("Notification" in window ? Notification.permission : "unsupported");
  }, []);

  async function save(next: NotificationPrefs) {
    const { error } = await supabase.from("profiles").update({ notification_prefs: next }).eq("id", user!.id);
    if (error) return toast.error(error.message);
    await refreshProfile();
  }

  async function enablePush(on: boolean) {
    if (!on) return save({ ...prefs, push_enabled: false });
    if (permission === "unsupported") return toast.error("This browser does not support notifications");
    let p: NotificationPermission = Notification.permission;
    if (p === "default") p = await Notification.requestPermission();
    setPermission(p);
    if (p !== "granted") return toast.error("Notifications are blocked in your browser settings");
    await save({ ...prefs, push_enabled: true });
    toast.success("Browser notifications enabled");
  }

  return (
    <>
      <Section title="Email notifications">
        <Toggle label="New messages" checked={prefs.messages} onChange={(v) => save({ ...prefs, messages: v })} />
        <Toggle label="New orders" checked={prefs.orders} onChange={(v) => save({ ...prefs, orders: v })} />
        <Toggle label="Friend requests" checked={prefs.friend_requests} onChange={(v) => save({ ...prefs, friend_requests: v })} />
      </Section>
      <Section title="Browser notifications">
        <p className="text-[15px] text-muted-foreground">Get a desktop or phone notification while PlugZone is open in a tab. We only ask for permission when you switch this on.</p>
        <Toggle label="Enable browser notifications" checked={!!prefs.push_enabled && permission === "granted"} onChange={enablePush} />
        {permission === "denied" && <p className="text-sm text-destructive">Notifications are blocked for this site. Allow them in your browser's site settings, then try again.</p>}
        {prefs.push_enabled && permission === "granted" && (
          <div className="space-y-1 border-t pt-3">
            {PUSH_CATEGORIES.map((c) => (
              <Toggle key={c.key} label={c.label} checked={prefs.push?.[c.key] !== false} onChange={(v) => save({ ...prefs, push: { ...prefs.push, [c.key]: v } })} />
            ))}
          </div>
        )}
      </Section>
      <PrivacySection />
    </>
  );
}

function PrivacySection() {
  const { profile, user, refreshProfile } = useAuth();
  const toast = useToast();
  async function set(v: boolean) {
    const { error } = await supabase.from("profiles").update({ show_last_seen: v }).eq("id", user!.id);
    if (error) return toast.error(error.message);
    await refreshProfile();
  }
  return (
    <Section title="Privacy">
      <Toggle label="Show when I was last online" checked={profile?.show_last_seen ?? true} onChange={set} />
      <p className="text-sm text-muted-foreground">Others always see whether you're online right now while you have PlugZone open.</p>
    </Section>
  );
}

function DangerSection() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function del() {
    setBusy(true);
    const { error } = await supabase.rpc("delete_my_account");
    setBusy(false);
    if (error) return toast.error(error.message);
    await signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <Section title="Delete account">
      <p className="text-[15px] text-muted-foreground">Permanently removes your profile, ads, orders, and messages. This cannot be undone.</p>
      <button className="btn btn-danger" onClick={() => setOpen(true)}>
        Delete Account
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Delete your account?">
        <p className="text-[15px] text-muted-foreground">
          Type <span className="font-mono font-medium text-foreground">{profile?.username}</span> to confirm.
        </p>
        <input className="input mt-3" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoFocus />
        <div className="mt-5 flex gap-2">
          <button className="btn btn-danger" disabled={confirm !== profile?.username || busy} onClick={del}>
            {busy ? "Deleting…" : "Delete Account"}
          </button>
          <button className="btn btn-secondary" onClick={() => setOpen(false)}>
            Cancel
          </button>
        </div>
      </Modal>
    </Section>
  );
}
