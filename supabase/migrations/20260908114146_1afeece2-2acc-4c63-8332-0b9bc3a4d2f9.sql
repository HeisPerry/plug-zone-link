DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'plugzone-auto-release';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.auto_release_due_escrows()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Automatic release is disabled: escrow is held until the buyer confirms receipt
  -- or an admin settles a reported problem.
  RETURN 0;
END; $$;

UPDATE public.orders SET auto_release_at = NULL WHERE auto_release_at IS NOT NULL;

DELETE FROM public.platform_settings WHERE key = 'auto_release_days';