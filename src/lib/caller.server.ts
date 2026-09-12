/**
 * Works out who is making a request.
 *
 * Sign-in still happens through the existing auth service. We verify the
 * token it issued, then look the role up in our own database.
 */
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { queryAs } from "./neon.server";
import type { Ctx } from "./data-policy.server";

function authFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(init?.headers);
    if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

export async function verifiedUserId(): Promise<{ userId: string | null; token: string | null }> {
  const request = getRequest();
  const header = request?.headers?.get("authorization");
  if (!header || !header.startsWith("Bearer ")) return { userId: null, token: null };
  const token = header.slice(7);
  if (!token || token.split(".").length !== 3) return { userId: null, token: null };

  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return { userId: null, token: null };

  const client = createClient(url, key, {
    global: { fetch: authFetch(key) },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getClaims(token);
  if (error || !data?.claims?.sub) return { userId: null, token: null };
  return { userId: String(data.claims.sub), token };
}

export async function resolveCaller(): Promise<Ctx> {
  const { userId } = await verifiedUserId();
  if (!userId) return { userId: null, isAdmin: false };
  const rows = await queryAs<{ ok: boolean }>(
    userId,
    "select coalesce(public.has_role($1::uuid, 'admin'::public.app_role), false) as ok",
    [userId],
  );
  return { userId, isAdmin: Boolean(rows[0]?.ok) };
}

/** Makes sure the signed-in person exists in our database. */
export async function syncUser(): Promise<string | null> {
  const { userId, token } = await verifiedUserId();
  if (!userId || !token) return null;

  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const client = createClient(url, key, {
    global: { fetch: authFetch(key), headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await client.auth.getUser();
  const user = data?.user;
  if (!user) return null;

  await queryAs(
    userId,
    `insert into auth.users (id, email, raw_user_meta_data)
     values ($1::uuid, $2, $3::jsonb)
     on conflict (id) do update set email = excluded.email`,
    [user.id, user.email ?? null, JSON.stringify(user.user_metadata ?? {})],
  );
  return userId;
}
