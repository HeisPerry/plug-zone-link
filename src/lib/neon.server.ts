/**
 * Connection to the Neon Postgres database.
 *
 * Every statement runs inside a transaction that first records who the caller
 * is (`app.user_id`). The stored routines resolve `auth.uid()` from that
 * setting, exactly like they did before the move.
 */
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let client: NeonQueryFunction<false, false> | null = null;

function db(): NeonQueryFunction<false, false> {
  if (!client) {
    const url = process.env["NEON_DATABASE_URL"];
    if (!url) throw new Error("The database is not configured.");
    client = neon(url);
  }
  return client;
}

export type Statement = { text: string; params: unknown[] };

/** Runs statements as the given user and returns each statement's rows. */
export async function runAs(userId: string | null, statements: Statement[]): Promise<any[][]> {
  const sql = db();
  const queries = [
    sql.query("select set_config('app.user_id', $1, true)", [userId ?? ""]),
    ...statements.map((s) => sql.query(s.text, s.params)),
  ];
  const results = (await sql.transaction(queries as any)) as any[];
  return results.slice(1).map((r) => (Array.isArray(r) ? r : (r?.rows ?? [])));
}

export async function queryAs<T = any>(
  userId: string | null,
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const [rows] = await runAs(userId, [{ text, params }]);
  return rows as T[];
}
