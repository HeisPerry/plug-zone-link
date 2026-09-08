-- ===== Settings =====
CREATE TABLE public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings readable by signed-in" ON public.platform_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins insert settings" ON public.platform_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update settings" ON public.platform_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.platform_settings (key, value, description) VALUES
  ('auto_release_days', '3', 'Days after delivery before held money is released to the seller automatically'),
  ('platform_fee_rate', '0.05', 'Platform fee taken from each completed sale (0.05 = 5%)'),
  ('refund_window_days', '14', 'Days after delivery during which a buyer may request a refund')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.setting_num(p_key text, p_default numeric)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((SELECT nullif(value #>> '{}', '')::numeric FROM public.platform_settings WHERE key = p_key), p_default);
$$;

CREATE OR REPLACE FUNCTION public.platform_fee_rate()
RETURNS numeric LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT coalesce(public.setting_num('platform_fee_rate', 0.05), 0.05);
$$;

CREATE OR REPLACE FUNCTION public.update_setting(p_key text, p_value jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  INSERT INTO public.platform_settings (key, value, updated_by) VALUES (p_key, p_value, auth.uid())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = auth.uid(), updated_at = now();
END; $$;

-- ===== Ledger =====
CREATE TABLE public.escrow_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  entry_type text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'NGN',
  note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX escrow_ledger_order_idx ON public.escrow_ledger(order_id, created_at);
GRANT SELECT ON public.escrow_ledger TO authenticated;
GRANT ALL ON public.escrow_ledger TO service_role;
ALTER TABLE public.escrow_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order parties read ledger" ON public.escrow_ledger FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = escrow_ledger.order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())) OR public.has_role(auth.uid(), 'admin'));

-- ===== Orders =====
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS auto_release_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_reason text,
  ADD COLUMN IF NOT EXISTS refund_requested_amount numeric,
  ADD COLUMN IF NOT EXISTS refunded_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid,
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending','accepted','shipped','delivered','completed','cancelled','disputed','refunded'));
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_escrow_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_escrow_status_check
  CHECK (escrow_status IN ('none','held','released','refunded','partially_refunded','disputed'));

DROP POLICY IF EXISTS orders_party_update ON public.orders;
CREATE POLICY "admins update orders" ON public.orders FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ===== Internal helpers (not callable by users) =====
CREATE OR REPLACE FUNCTION public.log_escrow(p_order uuid, p_type text, p_amount numeric, p_note text DEFAULT NULL, p_actor uuid DEFAULT NULL, p_meta jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tx uuid; v_cur text;
BEGIN
  SELECT t.id, t.currency INTO v_tx, v_cur FROM public.transactions t WHERE t.order_id = p_order ORDER BY t.created_at DESC LIMIT 1;
  IF v_cur IS NULL THEN SELECT a.currency INTO v_cur FROM public.orders o JOIN public.ads a ON a.id = o.ad_id WHERE o.id = p_order; END IF;
  INSERT INTO public.escrow_ledger (order_id, transaction_id, actor_id, entry_type, amount, currency, note, metadata)
  VALUES (p_order, v_tx, p_actor, p_type, coalesce(p_amount, 0), coalesce(v_cur, 'NGN'), p_note, coalesce(p_meta, '{}'::jsonb));
END; $$;

CREATE OR REPLACE FUNCTION public.release_escrow(p_order uuid, p_actor uuid, p_note text DEFAULT NULL, p_type text DEFAULT 'release')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o RECORD;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = p_order FOR UPDATE;
  IF o IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.escrow_status NOT IN ('held','disputed') THEN RAISE EXCEPTION 'There are no funds held for this order'; END IF;
  UPDATE public.transactions SET status = 'paid' WHERE order_id = p_order AND status IN ('pending','disputed');
  UPDATE public.orders SET status = 'completed', escrow_status = 'released', payment_status = 'paid', confirmed_at = now(),
    auto_release_at = NULL, refund_requested_at = NULL WHERE id = p_order;
  PERFORM public.log_escrow(p_order, p_type, o.total_price - o.refunded_amount, p_note, p_actor);
END; $$;

CREATE OR REPLACE FUNCTION public.refund_escrow(p_order uuid, p_amount numeric, p_actor uuid, p_note text DEFAULT NULL, p_final_status text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o RECORD; v_amt numeric;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = p_order FOR UPDATE;
  IF o IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.escrow_status NOT IN ('held','disputed') THEN RAISE EXCEPTION 'There are no funds held for this order'; END IF;
  v_amt := coalesce(p_amount, o.total_price);
  IF v_amt <= 0 OR v_amt > o.total_price THEN RAISE EXCEPTION 'Refund must be between 0 and the order total'; END IF;
  IF v_amt >= o.total_price THEN
    UPDATE public.transactions SET status = 'refunded' WHERE order_id = p_order AND status IN ('pending','disputed');
    UPDATE public.orders SET status = coalesce(p_final_status, 'refunded'), escrow_status = 'refunded', payment_status = 'refunded',
      refunded_amount = o.total_price, auto_release_at = NULL, refund_requested_at = NULL WHERE id = p_order;
    PERFORM public.log_escrow(p_order, 'refund', o.total_price, p_note, p_actor);
  ELSE
    UPDATE public.transactions SET amount = o.total_price - v_amt, status = 'paid' WHERE order_id = p_order AND status IN ('pending','disputed');
    UPDATE public.orders SET status = 'completed', escrow_status = 'partially_refunded', payment_status = 'partially_refunded',
      refunded_amount = v_amt, confirmed_at = now(), auto_release_at = NULL, refund_requested_at = NULL WHERE id = p_order;
    PERFORM public.log_escrow(p_order, 'partial_refund', v_amt, p_note, p_actor);
    PERFORM public.log_escrow(p_order, 'release', o.total_price - v_amt, 'Remainder released to seller', p_actor);
  END IF;
END; $$;

REVOKE ALL ON FUNCTION public.log_escrow(uuid,text,numeric,text,uuid,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_escrow(uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_escrow(uuid,numeric,uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.setting_num(text,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.setting_num(text,numeric) TO authenticated;
REVOKE ALL ON FUNCTION public.update_setting(text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_setting(text,jsonb) TO authenticated;

-- ===== Rewire existing flows =====
CREATE OR REPLACE FUNCTION public.pay_order_test_mode(p_order uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); o RECORD; v_cur text; v_tx uuid;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO o FROM public.orders WHERE id = p_order FOR UPDATE;
  IF o IS NULL OR o.buyer_id <> v_me THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.payment_status = 'paid' THEN RAISE EXCEPTION 'This order is already paid'; END IF;
  IF o.status = 'cancelled' THEN RAISE EXCEPTION 'This order was cancelled'; END IF;
  SELECT currency INTO v_cur FROM public.ads WHERE id = o.ad_id;
  INSERT INTO public.transactions (order_id, payer_id, payee_id, amount, platform_fee, seller_earnings, currency, status, reference, provider)
  VALUES (p_order, o.buyer_id, o.seller_id, o.total_price, 0, 0, coalesce(v_cur,'NGN'), 'pending',
          'TEST-' || upper(substr(md5(random()::text), 1, 10)), 'test_mode')
  RETURNING id INTO v_tx;
  UPDATE public.orders SET payment_status = 'paid', escrow_status = 'held', status = 'accepted' WHERE id = p_order;
  PERFORM public.log_escrow(p_order, 'hold', o.total_price, 'Payment received and held in escrow', v_me);
  RETURN v_tx;
END; $$;

CREATE OR REPLACE FUNCTION public.confirm_receipt(p_order uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); o RECORD;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = p_order;
  IF o IS NULL OR o.buyer_id <> v_me THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.escrow_status <> 'held' THEN RAISE EXCEPTION 'There are no funds held for this order'; END IF;
  PERFORM public.release_escrow(p_order, v_me, 'Buyer confirmed receipt');
END; $$;

CREATE OR REPLACE FUNCTION public.set_order_fulfilment(p_order uuid, p_stage text, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); o RECORD; v_days numeric;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = p_order FOR UPDATE;
  IF o IS NULL OR o.seller_id <> v_me THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.escrow_status = 'disputed' THEN RAISE EXCEPTION 'This order is under dispute'; END IF;
  IF o.escrow_status <> 'held' THEN RAISE EXCEPTION 'Wait for the buyer to pay before sending'; END IF;
  IF p_stage = 'shipped' THEN
    UPDATE public.orders SET status = 'shipped', shipped_at = now(), tracking_note = coalesce(nullif(trim(coalesce(p_note,'')),''), tracking_note) WHERE id = p_order;
  ELSIF p_stage = 'delivered' THEN
    v_days := public.setting_num('auto_release_days', 3);
    UPDATE public.orders SET status = 'delivered', delivered_at = now(),
      auto_release_at = CASE WHEN refund_requested_at IS NULL THEN now() + make_interval(days => v_days::int) ELSE NULL END,
      tracking_note = coalesce(nullif(trim(coalesce(p_note,'')),''), tracking_note) WHERE id = p_order;
  ELSE RAISE EXCEPTION 'Unknown fulfilment stage'; END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.open_dispute(p_order uuid, p_reason text, p_description text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); o RECORD; v_id uuid;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = p_order FOR UPDATE;
  IF o IS NULL OR (o.buyer_id <> v_me AND o.seller_id <> v_me) THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF nullif(trim(coalesce(p_description,'')),'') IS NULL THEN RAISE EXCEPTION 'Describe what went wrong'; END IF;
  IF EXISTS (SELECT 1 FROM public.disputes WHERE order_id = p_order) THEN RAISE EXCEPTION 'A dispute is already open on this order'; END IF;
  INSERT INTO public.disputes (order_id, opened_by, buyer_id, seller_id, reason, description)
  VALUES (p_order, v_me, o.buyer_id, o.seller_id, coalesce(nullif(trim(coalesce(p_reason,'')),''),'other'), trim(p_description))
  RETURNING id INTO v_id;
  UPDATE public.orders SET status = 'disputed', auto_release_at = NULL,
    escrow_status = CASE WHEN escrow_status = 'held' THEN 'disputed' ELSE escrow_status END WHERE id = p_order;
  UPDATE public.transactions SET status = 'disputed' WHERE order_id = p_order AND status = 'pending';
  IF o.escrow_status = 'held' THEN PERFORM public.log_escrow(p_order, 'dispute_hold', o.total_price, 'Funds frozen while the report is reviewed', v_me); END IF;
  RETURN v_id;
END; $$;

DROP FUNCTION IF EXISTS public.resolve_dispute(uuid, text, text);
CREATE OR REPLACE FUNCTION public.resolve_dispute(p_dispute uuid, p_outcome text, p_resolution text DEFAULT NULL, p_amount numeric DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); d RECORD;
BEGIN
  IF NOT public.has_role(v_me, 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT * INTO d FROM public.disputes WHERE id = p_dispute FOR UPDATE;
  IF d IS NULL THEN RAISE EXCEPTION 'Dispute not found'; END IF;
  IF p_outcome = 'refund_buyer' THEN
    PERFORM public.refund_escrow(d.order_id, NULL, v_me, coalesce(p_resolution, 'Dispute resolved: refunded to buyer'));
    UPDATE public.disputes SET status = 'refunded', resolution = p_resolution, resolved_by = v_me, resolved_at = now() WHERE id = p_dispute;
  ELSIF p_outcome = 'partial_refund' THEN
    IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Enter the amount to refund'; END IF;
    PERFORM public.refund_escrow(d.order_id, p_amount, v_me, coalesce(p_resolution, 'Dispute resolved: partial refund'));
    UPDATE public.disputes SET status = 'resolved', resolution = p_resolution, resolved_by = v_me, resolved_at = now() WHERE id = p_dispute;
  ELSIF p_outcome = 'release_seller' THEN
    PERFORM public.release_escrow(d.order_id, v_me, coalesce(p_resolution, 'Dispute resolved: released to seller'), 'dispute_release');
    UPDATE public.disputes SET status = 'resolved', resolution = p_resolution, resolved_by = v_me, resolved_at = now() WHERE id = p_dispute;
  ELSIF p_outcome IN ('under_review','waiting_buyer','waiting_seller','closed') THEN
    UPDATE public.disputes SET status = p_outcome, resolution = coalesce(p_resolution, resolution) WHERE id = p_dispute;
  ELSE RAISE EXCEPTION 'Unknown outcome'; END IF;
END; $$;
REVOKE ALL ON FUNCTION public.resolve_dispute(uuid,text,text,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_dispute(uuid,text,text,numeric) TO authenticated;

-- ===== New user actions =====
CREATE OR REPLACE FUNCTION public.seller_accept_order(p_order uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o RECORD;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = p_order FOR UPDATE;
  IF o IS NULL OR o.seller_id <> auth.uid() THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.status <> 'pending' THEN RAISE EXCEPTION 'This order is already %', o.status; END IF;
  UPDATE public.orders SET status = 'accepted' WHERE id = p_order;
END; $$;

CREATE OR REPLACE FUNCTION public.cancel_order(p_order uuid, p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); o RECORD;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = p_order FOR UPDATE;
  IF o IS NULL OR (o.buyer_id <> v_me AND o.seller_id <> v_me) THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.status NOT IN ('pending','accepted') THEN RAISE EXCEPTION 'This order can no longer be cancelled'; END IF;
  IF o.escrow_status = 'disputed' THEN RAISE EXCEPTION 'This order is under dispute'; END IF;
  UPDATE public.orders SET cancelled_by = v_me, cancel_reason = nullif(trim(coalesce(p_reason,'')),''), cancelled_at = now() WHERE id = p_order;
  IF o.escrow_status = 'held' THEN
    PERFORM public.refund_escrow(p_order, NULL, v_me,
      CASE WHEN v_me = o.seller_id THEN 'Seller cancelled — full refund' ELSE 'Buyer cancelled before delivery — full refund' END, 'cancelled');
  ELSE
    UPDATE public.orders SET status = 'cancelled' WHERE id = p_order;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.request_refund(p_order uuid, p_reason text, p_amount numeric DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); o RECORD; v_amt numeric;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = p_order FOR UPDATE;
  IF o IS NULL OR o.buyer_id <> v_me THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.escrow_status <> 'held' THEN RAISE EXCEPTION 'There is no held payment to refund'; END IF;
  IF o.refund_requested_at IS NOT NULL THEN RAISE EXCEPTION 'You already have a refund request open'; END IF;
  IF nullif(trim(coalesce(p_reason,'')),'') IS NULL THEN RAISE EXCEPTION 'Tell the seller why you want a refund'; END IF;
  v_amt := coalesce(p_amount, o.total_price);
  IF v_amt <= 0 OR v_amt > o.total_price THEN RAISE EXCEPTION 'Refund amount must be between 0 and the order total'; END IF;
  UPDATE public.orders SET refund_requested_at = now(), refund_reason = trim(p_reason), refund_requested_amount = v_amt, auto_release_at = NULL WHERE id = p_order;
  PERFORM public.log_escrow(p_order, 'refund_requested', v_amt, trim(p_reason), v_me);
  PERFORM public.notify(o.seller_id, 'refund_request', public.display_name_of(v_me) || ' requested a refund',
    to_char(v_amt, 'FM999,999,999,990.00') || ' — ' || left(trim(p_reason), 100), '/order/' || p_order, v_me, 'order', p_order);
END; $$;

CREATE OR REPLACE FUNCTION public.withdraw_refund_request(p_order uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); o RECORD; v_days numeric;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = p_order FOR UPDATE;
  IF o IS NULL OR o.buyer_id <> v_me THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.refund_requested_at IS NULL THEN RETURN; END IF;
  v_days := public.setting_num('auto_release_days', 3);
  UPDATE public.orders SET refund_requested_at = NULL, refund_requested_amount = NULL,
    auto_release_at = CASE WHEN status = 'delivered' AND escrow_status = 'held' THEN now() + make_interval(days => v_days::int) ELSE NULL END
  WHERE id = p_order;
  PERFORM public.log_escrow(p_order, 'refund_request_withdrawn', coalesce(o.refund_requested_amount, 0), NULL, v_me);
END; $$;

CREATE OR REPLACE FUNCTION public.respond_refund_request(p_order uuid, p_action text, p_amount numeric DEFAULT NULL, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); o RECORD; v_amt numeric; v_days numeric;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = p_order FOR UPDATE;
  IF o IS NULL OR o.seller_id <> v_me THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.refund_requested_at IS NULL THEN RAISE EXCEPTION 'There is no refund request on this order'; END IF;
  IF o.escrow_status <> 'held' THEN RAISE EXCEPTION 'There is no held payment to refund'; END IF;
  IF p_action = 'approve' THEN
    v_amt := coalesce(p_amount, o.refund_requested_amount, o.total_price);
    PERFORM public.refund_escrow(p_order, v_amt, v_me, coalesce(nullif(trim(coalesce(p_note,'')),''), 'Seller approved the refund request'));
    PERFORM public.notify(o.buyer_id, 'refund_approved', 'Refund approved', to_char(v_amt, 'FM999,999,999,990.00') || ' is on its way back to you', '/order/' || p_order, v_me, 'order', p_order);
  ELSIF p_action = 'decline' THEN
    v_days := public.setting_num('auto_release_days', 3);
    UPDATE public.orders SET refund_requested_at = NULL,
      auto_release_at = CASE WHEN status = 'delivered' THEN now() + make_interval(days => v_days::int) ELSE NULL END WHERE id = p_order;
    PERFORM public.log_escrow(p_order, 'refund_declined', coalesce(o.refund_requested_amount, 0), nullif(trim(coalesce(p_note,'')),''), v_me);
    PERFORM public.notify(o.buyer_id, 'refund_declined', 'Refund declined', coalesce(nullif(trim(coalesce(p_note,'')),''), 'You can report a problem if you disagree.'), '/order/' || p_order, v_me, 'order', p_order);
  ELSE RAISE EXCEPTION 'Unknown action'; END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_settle_order(p_order uuid, p_action text, p_amount numeric DEFAULT NULL, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_me, 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF p_action = 'release' THEN PERFORM public.release_escrow(p_order, v_me, coalesce(p_note, 'Released by PlugZone team'), 'admin_release');
  ELSIF p_action = 'refund' THEN PERFORM public.refund_escrow(p_order, p_amount, v_me, coalesce(p_note, 'Refunded by PlugZone team'));
  ELSE RAISE EXCEPTION 'Unknown action'; END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.auto_release_due_escrows()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; n integer := 0;
BEGIN
  FOR r IN SELECT id FROM public.orders WHERE escrow_status = 'held' AND status = 'delivered' AND refund_requested_at IS NULL
           AND auto_release_at IS NOT NULL AND auto_release_at <= now() LOOP
    BEGIN
      PERFORM public.release_escrow(r.id, NULL, 'Released automatically — buyer did not report a problem in time', 'auto_release');
      n := n + 1;
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END LOOP;
  RETURN n;
END; $$;

REVOKE ALL ON FUNCTION public.auto_release_due_escrows() FROM PUBLIC, anon, authenticated;
DO $$ DECLARE f text; BEGIN
  FOREACH f IN ARRAY ARRAY['seller_accept_order(uuid)','cancel_order(uuid,text)','request_refund(uuid,text,numeric)','withdraw_refund_request(uuid)','respond_refund_request(uuid,text,numeric,text)','admin_settle_order(uuid,text,numeric,text)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', f);
  END LOOP;
END $$;

-- ===== Scheduled auto-release (hourly; release window is measured in days) =====
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
  PERFORM cron.unschedule('plugzone-auto-release') FROM cron.job WHERE jobname = 'plugzone-auto-release';
  PERFORM cron.schedule('plugzone-auto-release', '0 * * * *', 'SELECT public.auto_release_due_escrows()');
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'pg_cron unavailable: %', SQLERRM; END $$;