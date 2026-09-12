/**
 * Shared shapes for the data layer.
 *
 * The browser never talks to Postgres directly. It describes what it wants
 * with one of these specs; the server checks it against the access rules for
 * that table, turns it into SQL, and runs it.
 */

export type FilterOp =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "like"
  | "ilike"
  | "is"
  | "in"
  | "contains"
  | "or";

export type Filter = { op: FilterOp; col: string; val: unknown };

export type OrderBy = { col: string; asc: boolean };

export type QuerySpec = {
  table: string;
  action: "select" | "insert" | "update" | "delete";
  /** Column list as written by the caller, e.g. "*" or "id, title". */
  columns?: string;
  /** Row (or rows) for insert, or the patch for update. */
  values?: Record<string, unknown> | Record<string, unknown>[];
  filters: Filter[];
  order?: OrderBy[];
  limit?: number;
  offset?: number;
  count?: boolean;
  head?: boolean;
  /** Column list to return after a write, when the caller chained .select(). */
  returning?: string | null;
  single?: "one" | "maybe" | null;
};

export type QueryResult<T> = { data: T; error: { message: string } | null; count: number | null };
