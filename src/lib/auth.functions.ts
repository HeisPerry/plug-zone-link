import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { usernameSchema } from "./validators";

const input = z.object({
  username: usernameSchema,
  password: z.string().min(1).max(200),
});

export type UsernameSignInResult =
  | { ok: true; access_token: string; refresh_token: string }
  | { ok: false; reason: "invalid" | "unconfirmed" };

/**
 * Signs a user in by PlugZone username.
 * The username → email lookup happens only on the server, and the email is never
 * returned to the browser: on success the caller receives session tokens, on
 * failure a generic "invalid" so nobody can probe which usernames exist.
 */
export const signInWithUsername = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => input.parse(data))
  .handler(async ({ data }): Promise<UsernameSignInResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("username", data.username.toLowerCase())
      .maybeSingle();
    if (!profile) return { ok: false, reason: "invalid" };

    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    const email = userRes?.user?.email;
    if (!email) return { ok: false, reason: "invalid" };

    // Fresh, non-persisting client so the password check runs through the normal
    // auth flow (same hashing, rate limits and confirmation rules as email login).
    const authClient = createClient<Database>(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data: signIn, error } = await authClient.auth.signInWithPassword({ email, password: data.password });
    if (error || !signIn.session) {
      return { ok: false, reason: error?.code === "email_not_confirmed" ? "unconfirmed" : "invalid" };
    }
    return { ok: true, access_token: signIn.session.access_token, refresh_token: signIn.session.refresh_token };
  });
