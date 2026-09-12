/**
 * The only way the browser reaches the database.
 *
 * Requests arrive as a description of what is wanted; the server checks the
 * caller, applies that table's access rules, and runs the resulting SQL.
 */
import { createServerFn } from "@tanstack/react-start";
import type { QuerySpec } from "./db-spec";

export type RpcSpec = { name: string; args: Record<string, unknown> };

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  return { data: null, error: { message }, count: null };
}

export const dbQuery = createServerFn({ method: "POST" })
  .inputValidator((input: QuerySpec) => input)
  .handler(async ({ data: spec }) => {
    try {
      const [{ resolveCaller }, { build }, { runAs }] = await Promise.all([
        import("./caller.server"),
        import("./query-build.server"),
        import("./neon.server"),
      ]);
      const ctx = await resolveCaller();
      const built = build(spec, ctx);

      if (built.checkText) {
        const [rows] = await runAs(ctx.userId, [
          { text: built.checkText, params: built.checkParams ?? [] },
        ]);
        if (!rows?.[0]?.ok) throw new Error("You do not have access to this.");
      }

      const statements = [{ text: built.text, params: built.params }];
      if (built.countText) {
        statements.push({ text: built.countText, params: built.countParams ?? [] });
      }
      if (spec.head && built.countText) statements.shift();

      const results = await runAs(ctx.userId, statements);
      const rows = spec.head && built.countText ? [] : (results[0] ?? []);
      const countRows = built.countText ? results[spec.head ? 0 : 1] : null;

      return {
        data: rows,
        error: null,
        count: countRows ? Number(countRows[0]?.n ?? 0) : null,
      };
    } catch (error) {
      return failure(error);
    }
  });

export const dbRpc = createServerFn({ method: "POST" })
  .inputValidator((input: RpcSpec) => input)
  .handler(async ({ data: spec }) => {
    try {
      const [{ resolveCaller }, { ALLOWED_RPCS }, { queryAs }] = await Promise.all([
        import("./caller.server"),
        import("./data-policy.server"),
        import("./neon.server"),
      ]);
      if (!ALLOWED_RPCS.has(spec.name)) throw new Error(`Unknown action: ${spec.name}`);
      const ctx = await resolveCaller();

      const entries = Object.entries(spec.args || {}).filter(([, v]) => v !== undefined);
      for (const [key] of entries) {
        if (!/^[a-z_][a-z0-9_]*$/.test(key)) throw new Error("Invalid input.");
      }
      const params = entries.map(([, v]) =>
        v !== null && typeof v === "object" && !Array.isArray(v) ? JSON.stringify(v) : v,
      );
      const args = entries.map(([key], i) => `${key} => $${i + 1}`).join(", ");

      const info = await queryAs<{ retset: boolean }>(
        ctx.userId,
        `select p.proretset as retset from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = $1 limit 1`,
        [spec.name],
      );
      const returnsRows = Boolean(info[0]?.retset);

      const text = returnsRows
        ? `select * from public.${spec.name}(${args})`
        : `select public.${spec.name}(${args}) as value`;
      const rows = await queryAs(ctx.userId, text, params);

      if (returnsRows) return { data: rows, error: null, count: null };
      const value = rows[0]?.value;
      return { data: value === "" || value === undefined ? null : value, error: null, count: null };
    } catch (error) {
      return failure(error);
    }
  });

/** Creates the person's record in our database the first time they appear. */
export const syncAccount = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const { syncUser } = await import("./caller.server");
    return { userId: await syncUser(), error: null };
  } catch (error) {
    return { userId: null, error: error instanceof Error ? error.message : "Sync failed" };
  }
});
