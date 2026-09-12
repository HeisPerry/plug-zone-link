/**
 * Small client for the app's data.
 *
 * It reads like the query builder the app already used, so screens and hooks
 * keep their existing shape, but every call goes through the server, which
 * checks permissions before touching the database.
 */
import type { Filter, OrderBy, QueryResult, QuerySpec } from "./db-spec";
import { dbQuery, dbRpc, syncAccount } from "./data.functions";

export type Row = any;

type Raw = { data: any; error: { message: string } | null; count: number | null };

class Query<T = any[]> implements PromiseLike<QueryResult<T>> {
  private spec: QuerySpec;

  constructor(table: string, action: QuerySpec["action"], values?: any) {
    this.spec = { table, action, filters: [], values, single: null };
  }

  select(columns = "*", options?: { count?: "exact"; head?: boolean }) {
    if (this.spec.action === "select") this.spec.columns = columns;
    else this.spec.returning = columns;
    if (options?.count) this.spec.count = true;
    if (options?.head) this.spec.head = true;
    return this;
  }

  private push(op: Filter["op"], col: string, val: unknown) {
    this.spec.filters.push({ op, col, val });
    return this;
  }

  eq(col: string, val: unknown) { return this.push("eq", col, val); }
  neq(col: string, val: unknown) { return this.push("neq", col, val); }
  gt(col: string, val: unknown) { return this.push("gt", col, val); }
  gte(col: string, val: unknown) { return this.push("gte", col, val); }
  lt(col: string, val: unknown) { return this.push("lt", col, val); }
  lte(col: string, val: unknown) { return this.push("lte", col, val); }
  like(col: string, val: unknown) { return this.push("like", col, val); }
  ilike(col: string, val: unknown) { return this.push("ilike", col, val); }
  is(col: string, val: unknown) { return this.push("is", col, val); }
  in(col: string, val: unknown[]) { return this.push("in", col, val); }
  contains(col: string, val: unknown) { return this.push("contains", col, val); }
  or(expression: string) { return this.push("or", "or", expression); }
  filter(col: string, op: string, val: unknown) { return this.push(op as Filter["op"], col, val); }

  order(col: string, options?: { ascending?: boolean }) {
    const entry: OrderBy = { col, asc: options?.ascending !== false };
    this.spec.order = [...(this.spec.order || []), entry];
    return this;
  }

  limit(n: number) { this.spec.limit = n; return this; }

  range(from: number, to: number) {
    this.spec.offset = from;
    this.spec.limit = to - from + 1;
    return this;
  }

  single(): Query<any> { this.spec.single = "one"; return this as any; }
  maybeSingle(): Query<any> { this.spec.single = "maybe"; return this as any; }

  private async run(): Promise<QueryResult<any>> {
    let raw: Raw;
    try {
      raw = (await dbQuery({ data: this.spec })) as Raw;
    } catch (error) {
      raw = { data: null, error: { message: error instanceof Error ? error.message : "Request failed" }, count: null };
    }
    if (raw.error) return { data: null as any, error: raw.error, count: null };

    const rows: any[] = Array.isArray(raw.data) ? raw.data : [];
    if (this.spec.single === "one") {
      if (rows.length !== 1) {
        return { data: null as any, error: { message: "No matching record was found." }, count: raw.count };
      }
      return { data: rows[0], error: null, count: raw.count };
    }
    if (this.spec.single === "maybe") {
      return { data: (rows[0] ?? null) as any, error: null, count: raw.count };
    }
    if (this.spec.action !== "select" && !this.spec.returning) {
      return { data: null as any, error: null, count: raw.count };
    }
    return { data: rows as any, error: null, count: raw.count };
  }

  then<R1 = QueryResult<T>, R2 = never>(
    onfulfilled?: ((value: QueryResult<T>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return this.run().then(onfulfilled as any, onrejected as any);
  }
}

class Table {
  constructor(private name: string) {}
  select(columns = "*", options?: { count?: "exact"; head?: boolean }) {
    return new Query(this.name, "select").select(columns, options);
  }
  insert(values: any) { return new Query(this.name, "insert", values); }
  update(values: any) { return new Query(this.name, "update", values); }
  delete() { return new Query(this.name, "delete"); }
}

class Rpc<T = any> implements PromiseLike<QueryResult<T>> {
  private mode: "one" | "maybe" | null = null;
  constructor(private name: string, private args: Record<string, unknown>) {}

  single(): Rpc<any> { this.mode = "one"; return this as any; }
  maybeSingle(): Rpc<any> { this.mode = "maybe"; return this as any; }

  private async run(): Promise<QueryResult<any>> {
    let raw: Raw;
    try {
      raw = (await dbRpc({ data: { name: this.name, args: this.args } })) as Raw;
    } catch (error) {
      raw = { data: null, error: { message: error instanceof Error ? error.message : "Request failed" }, count: null };
    }
    if (raw.error) return { data: null as any, error: raw.error, count: null };
    if (this.mode) {
      const rows: any[] = Array.isArray(raw.data) ? raw.data : [raw.data];
      if (this.mode === "one" && rows.length !== 1) {
        return { data: null as any, error: { message: "No matching record was found." }, count: null };
      }
      return { data: (rows[0] ?? null) as any, error: null, count: null };
    }
    return { data: raw.data, error: null, count: null };
  }

  then<R1 = QueryResult<T>, R2 = never>(
    onfulfilled?: ((value: QueryResult<T>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return this.run().then(onfulfilled as any, onrejected as any);
  }
}

export const db = {
  from: (table: string) => new Table(table),
  rpc: (name: string, args: Record<string, unknown> = {}) => new Rpc(name, args),
  syncAccount: async () => {
    try {
      return await syncAccount();
    } catch {
      return { userId: null, error: "Sync failed" };
    }
  },
};
