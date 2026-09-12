/**
 * Turns a request from the browser into SQL.
 *
 * Identifiers are validated against a strict pattern and every value travels
 * as a bound parameter, so nothing the browser sends can become SQL.
 */
import type { Filter, QuerySpec } from "./db-spec";
import { EMBEDS, RULES, type Ctx } from "./data-policy.server";

const IDENT = /^[a-z_][a-z0-9_]*$/;

function ident(name: string): string {
  const clean = name.trim();
  if (!IDENT.test(clean)) throw new Error(`Unknown column: ${name}`);
  return clean;
}

export function createBinder() {
  const params: unknown[] = [];
  const bind = (value: unknown) => {
    if (value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      params.push(JSON.stringify(value));
      return `$${params.length}::jsonb`;
    }
    params.push(value);
    return `$${params.length}`;
  };
  return { params, bind };
}

type Parsed = { columns: string[]; embeds: { alias: string; columns: string }[] };

/** Splits "id, title, seller:profiles!fk(id, username)" into plain and related columns. */
function parseColumns(columns: string): Parsed {
  const out: Parsed = { columns: [], embeds: [] };
  let depth = 0;
  let buf = "";
  const parts: string[] = [];
  for (const ch of columns) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(buf);
      buf = "";
    } else buf += ch;
  }
  if (buf.trim()) parts.push(buf);

  for (const raw of parts) {
    const part = raw.trim();
    if (!part) continue;
    const open = part.indexOf("(");
    if (open === -1) {
      out.columns.push(part);
      continue;
    }
    const head = part.slice(0, open);
    const inner = part.slice(open + 1, part.lastIndexOf(")"));
    const alias = (head.includes(":") ? head.split(":")[0] : head.split("!")[0]).trim();
    out.embeds.push({ alias, columns: inner });
  }
  return out;
}

function selectList(table: string, columns: string): string {
  const trimmed = (columns || "*").trim();
  if (trimmed === "*") return "t.*";
  const parsed = parseColumns(trimmed);
  const pieces: string[] = [];
  for (const col of parsed.columns) {
    pieces.push(col.trim() === "*" ? "t.*" : `t.${ident(col)}`);
  }
  for (const embed of parsed.embeds) {
    const rel = EMBEDS[`${table}.${embed.alias}`];
    if (!rel) throw new Error(`Unknown related data: ${embed.alias}`);
    const inner = parseColumns(embed.columns).columns.map((c) =>
      c.trim() === "*" ? "r.*" : `r.${ident(c)}`,
    );
    pieces.push(
      `(select row_to_json(x) from (select ${inner.join(", ")} from public.${ident(rel.table)} r where r.${ident(rel.foreignColumn)} = t.${ident(rel.localColumn)}) x) as ${ident(embed.alias)}`,
    );
  }
  return pieces.join(", ");
}

function condition(f: Filter, bind: (v: unknown) => string): string {
  if (f.op === "or") {
    const clauses = String(f.val)
      .split(",")
      .map((piece) => {
        const [col, op, ...rest] = piece.trim().split(".");
        const value = rest.join(".");
        return condition(
          { col: col!, op: op as Filter["op"], val: value === "null" ? null : value },
          bind,
        );
      });
    return `(${clauses.join(" or ")})`;
  }

  const col = `t.${ident(f.col)}`;
  switch (f.op) {
    case "eq":
      return f.val === null ? `${col} is null` : `${col} = ${bind(f.val)}`;
    case "neq":
      return f.val === null ? `${col} is not null` : `${col} <> ${bind(f.val)}`;
    case "gt":
      return `${col} > ${bind(f.val)}`;
    case "gte":
      return `${col} >= ${bind(f.val)}`;
    case "lt":
      return `${col} < ${bind(f.val)}`;
    case "lte":
      return `${col} <= ${bind(f.val)}`;
    case "like":
      return `${col} like ${bind(f.val)}`;
    case "ilike":
      return `${col} ilike ${bind(f.val)}`;
    case "is":
      return f.val === null ? `${col} is null` : `${col} is ${f.val ? "true" : "false"}`;
    case "in":
      return `${col} = any(${bind(f.val)})`;
    case "contains":
      return `${col} @> ${bind(f.val)}`;
    default:
      throw new Error(`Unsupported filter: ${String(f.op)}`);
  }
}

export type Built = {
  text: string;
  params: unknown[];
  countText?: string;
  countParams?: unknown[];
  /** Boolean expression to verify before an insert. */
  checkText?: string;
  checkParams?: unknown[];
};

export function build(spec: QuerySpec, ctx: Ctx): Built {
  const rules = RULES[spec.table];
  if (!rules) throw new Error(`This data is not available: ${spec.table}`);

  const { params, bind } = createBinder();
  const filters = (spec.filters || []).map((f) => condition(f, bind));

  if (spec.action === "select") {
    const policy = rules.select?.(ctx, bind);
    if (!policy) throw new Error("You do not have access to this.");
    const where = [policy, ...filters].join(" and ");
    const order = (spec.order || [])
      .map((o) => `t.${ident(o.col)} ${o.asc ? "asc" : "desc"}`)
      .join(", ");

    let text = `select ${selectList(spec.table, spec.columns || "*")} from public.${ident(spec.table)} t where ${where}`;
    if (order) text += ` order by ${order}`;
    if (typeof spec.limit === "number") text += ` limit ${Math.max(0, Math.floor(spec.limit))}`;
    if (typeof spec.offset === "number") text += ` offset ${Math.max(0, Math.floor(spec.offset))}`;

    const built: Built = { text, params };
    if (spec.count) {
      built.countText = `select count(*)::int as n from public.${ident(spec.table)} t where ${where}`;
      built.countParams = params;
    }
    return built;
  }

  if (spec.action === "insert") {
    const rows = (Array.isArray(spec.values) ? spec.values : [spec.values || {}]) as Record<string, unknown>[];
    if (rows.length !== 1) throw new Error("Only one row can be added at a time.");
    const forced = rules.force?.(ctx) || {};
    const row: Record<string, unknown> = { ...rows[0], ...forced };
    if (rules.writable) {
      for (const key of Object.keys(row)) {
        if (!(key in forced) && !rules.writable.includes(key)) delete row[key];
      }
    }

    const checkBinder = createBinder();
    const check = rules.insert?.(ctx, checkBinder.bind, row);
    if (!check) throw new Error("You do not have access to this.");

    const cols = Object.keys(row).map(ident);
    const vals = Object.keys(row).map((k) => bind(row[k]));
    const text =
      `insert into public.${ident(spec.table)} (${cols.join(", ")}) values (${vals.join(", ")}) ` +
      `returning ${spec.returning ? selectList(spec.table, spec.returning).replace(/\bt\./g, "") : "*"}`;
    return {
      text,
      params,
      checkText: `select (${check}) as ok`,
      checkParams: checkBinder.params,
    };
  }

  if (spec.action === "update") {
    const policy = rules.update?.(ctx, bind);
    if (!policy) throw new Error("You do not have access to this.");
    const patch = { ...(spec.values as Record<string, unknown>) };
    if (rules.writable) {
      for (const key of Object.keys(patch)) {
        if (!rules.writable.includes(key)) delete patch[key];
      }
    }
    if (!Object.keys(patch).length) throw new Error("Nothing to update.");
    const sets = Object.keys(patch).map((k) => `${ident(k)} = ${bind(patch[k])}`);
    const where = [policy, ...filters].join(" and ");
    const text =
      `update public.${ident(spec.table)} t set ${sets.join(", ")} where ${where} ` +
      `returning ${spec.returning ? selectList(spec.table, spec.returning).replace(/\bt\./g, "") : "*"}`;
    return { text, params };
  }

  const policy = rules.delete?.(ctx, bind);
  if (!policy) throw new Error("You do not have access to this.");
  const where = [policy, ...filters].join(" and ");
  return {
    text: `delete from public.${ident(spec.table)} t where ${where} returning t.*`,
    params,
  };
}
