CREATE OR REPLACE FUNCTION public.__dump_ddl()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $fn$
DECLARE
  out text := '';
BEGIN
  -- enums
  SELECT out || coalesce(string_agg(d, E';\n') || E';\n', '') INTO out FROM (
    SELECT 'CREATE TYPE public.'||t.typname||' AS ENUM ('||string_agg(quote_literal(e.enumlabel), ', ' ORDER BY e.enumsortorder)||')' AS d
    FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE n.nspname='public' GROUP BY t.typname) x;

  -- tables
  SELECT out || coalesce(string_agg(d, E';\n' ORDER BY tn) || E';\n', '') INTO out FROM (
    SELECT c.relname AS tn, 'CREATE TABLE public.'||c.relname||' ('||E'\n  '||string_agg(
      a.attname||' '||format_type(a.atttypid,a.atttypmod)
      ||coalesce(' DEFAULT '||pg_get_expr(ad.adbin,ad.adrelid),'')
      ||CASE WHEN a.attnotnull THEN ' NOT NULL' ELSE '' END, E',\n  ' ORDER BY a.attnum)||E'\n)' AS d
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
    LEFT JOIN pg_attrdef ad ON ad.adrelid=c.oid AND ad.adnum=a.attnum
    WHERE n.nspname='public' AND c.relkind='r'
    GROUP BY c.relname) x;

  -- constraints (pk/unique/check first, then fk)
  SELECT out || coalesce(string_agg(d, E';\n' ORDER BY ord, tn, cn) || E';\n', '') INTO out FROM (
    SELECT CASE WHEN con.contype='f' THEN 2 ELSE 1 END AS ord, c.relname AS tn, con.conname AS cn,
      'ALTER TABLE public.'||c.relname||' ADD CONSTRAINT '||con.conname||' '||pg_get_constraintdef(con.oid) AS d
    FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND con.contype IN ('p','u','c','f')) x;

  -- indexes
  SELECT out || coalesce(string_agg(d, E';\n' ORDER BY d) || E';\n', '') INTO out FROM (
    SELECT i.indexdef AS d FROM pg_indexes i
    WHERE i.schemaname='public'
      AND NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class ic ON ic.oid=con.conindid WHERE ic.relname=i.indexname)) x;

  -- functions
  SELECT out || coalesce(string_agg(d, E';\n' ORDER BY d) || E';\n', '') INTO out FROM (
    SELECT pg_get_functiondef(p.oid) AS d FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prokind='f' AND p.proname <> '__dump_ddl') x;

  -- triggers
  SELECT out || coalesce(string_agg(d, E';\n' ORDER BY d) || E';\n', '') INTO out FROM (
    SELECT pg_get_triggerdef(t.oid) AS d FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal) x;

  RETURN out;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.__dump_ddl() TO anon, authenticated, service_role;