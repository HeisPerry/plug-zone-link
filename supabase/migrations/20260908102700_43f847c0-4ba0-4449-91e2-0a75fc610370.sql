-- Become a seller ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.become_seller(
  p_business_name text, p_about text DEFAULT NULL, p_contact_email text DEFAULT NULL,
  p_contact_phone text DEFAULT NULL, p_payout_method text DEFAULT 'bank_transfer',
  p_payout_account_name text DEFAULT NULL, p_payout_bank text DEFAULT NULL, p_payout_account_number text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); v_id uuid; v_last4 text;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF nullif(trim(coalesce(p_business_name,'')),'') IS NULL THEN RAISE EXCEPTION 'Enter a business or store name'; END IF;
  v_last4 := right(regexp_replace(coalesce(p_payout_account_number,''), '\D', '', 'g'), 4);
  INSERT INTO public.seller_profiles (user_id, business_name, about, contact_email, contact_phone, payout_method, payout_account_name, payout_bank, payout_account_last4)
  VALUES (v_me, trim(p_business_name), nullif(trim(coalesce(p_about,'')),''), nullif(trim(coalesce(p_contact_email,'')),''), nullif(trim(coalesce(p_contact_phone,'')),''),
          coalesce(p_payout_method,'bank_transfer'), nullif(trim(coalesce(p_payout_account_name,'')),''), nullif(trim(coalesce(p_payout_bank,'')),''), nullif(v_last4,''))
  ON CONFLICT (user_id) DO UPDATE SET
    business_name = EXCLUDED.business_name, about = EXCLUDED.about, contact_email = EXCLUDED.contact_email,
    contact_phone = EXCLUDED.contact_phone, payout_method = EXCLUDED.payout_method,
    payout_account_name = EXCLUDED.payout_account_name, payout_bank = EXCLUDED.payout_bank,
    payout_account_last4 = coalesce(EXCLUDED.payout_account_last4, public.seller_profiles.payout_account_last4)
  RETURNING id INTO v_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_me, 'seller') ON CONFLICT DO NOTHING;
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.become_seller(text,text,text,text,text,text,text,text) FROM anon;

-- Place order ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.place_order(
  p_ad uuid, p_quantity integer DEFAULT 1, p_delivery_method text DEFAULT 'delivery',
  p_delivery_address text DEFAULT NULL, p_buyer_name text DEFAULT NULL, p_buyer_phone text DEFAULT NULL, p_notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); v_ad RECORD; v_order uuid; v_total numeric;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_quantity IS NULL OR p_quantity < 1 THEN RAISE EXCEPTION 'Quantity must be at least 1'; END IF;
  SELECT * INTO v_ad FROM public.ads WHERE id = p_ad AND status = 'active';
  IF v_ad IS NULL THEN RAISE EXCEPTION 'This listing is no longer available'; END IF;
  IF v_ad.seller_id = v_me THEN RAISE EXCEPTION 'You cannot buy your own listing'; END IF;
  v_total := v_ad.price * p_quantity;
  INSERT INTO public.orders (ad_id, buyer_id, seller_id, quantity, total_price, status, payment_status, escrow_status,
                             delivery_method, delivery_address, buyer_name, buyer_phone, notes)
  VALUES (p_ad, v_me, v_ad.seller_id, p_quantity, v_total, 'pending', 'pending', 'none',
          p_delivery_method, nullif(trim(coalesce(p_delivery_address,'')),''), nullif(trim(coalesce(p_buyer_name,'')),''),
          nullif(trim(coalesce(p_buyer_phone,'')),''), nullif(trim(coalesce(p_notes,'')),''))
  RETURNING id INTO v_order;
  RETURN v_order;
END; $$;
REVOKE ALL ON FUNCTION public.place_order(uuid,integer,text,text,text,text,text) FROM anon;

-- Test-mode payment (no real money) -----------------------------------
CREATE OR REPLACE FUNCTION public.pay_order_test_mode(p_order uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); o RECORD; v_cur text; v_tx uuid;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO o FROM public.orders WHERE id = p_order FOR UPDATE;
  IF o IS NULL OR o.buyer_id <> v_me THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.payment_status = 'paid' THEN RAISE EXCEPTION 'This order is already paid'; END IF;
  SELECT currency INTO v_cur FROM public.ads WHERE id = o.ad_id;
  INSERT INTO public.transactions (order_id, payer_id, payee_id, amount, platform_fee, seller_earnings, currency, status, reference, provider)
  VALUES (p_order, o.buyer_id, o.seller_id, o.total_price, 0, 0, coalesce(v_cur,'NGN'), 'pending',
          'TEST-' || upper(substr(md5(random()::text), 1, 10)), 'test_mode')
  RETURNING id INTO v_tx;
  UPDATE public.orders SET payment_status = 'paid', escrow_status = 'held', status = 'accepted' WHERE id = p_order;
  RETURN v_tx;
END; $$;
REVOKE ALL ON FUNCTION public.pay_order_test_mode(uuid) FROM anon;

-- Fulfilment -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_order_fulfilment(p_order uuid, p_stage text, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); o RECORD;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = p_order FOR UPDATE;
  IF o IS NULL OR o.seller_id <> v_me THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.escrow_status = 'disputed' THEN RAISE EXCEPTION 'This order is under dispute'; END IF;
  IF p_stage = 'shipped' THEN
    UPDATE public.orders SET status = 'shipped', shipped_at = now(), tracking_note = coalesce(nullif(trim(coalesce(p_note,'')),''), tracking_note) WHERE id = p_order;
  ELSIF p_stage = 'delivered' THEN
    UPDATE public.orders SET status = 'delivered', delivered_at = now(), tracking_note = coalesce(nullif(trim(coalesce(p_note,'')),''), tracking_note) WHERE id = p_order;
  ELSE RAISE EXCEPTION 'Unknown fulfilment stage'; END IF;
END; $$;
REVOKE ALL ON FUNCTION public.set_order_fulfilment(uuid,text,text) FROM anon;

-- Buyer confirms receipt -> release escrow ------------------------------
CREATE OR REPLACE FUNCTION public.confirm_receipt(p_order uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); o RECORD;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = p_order FOR UPDATE;
  IF o IS NULL OR o.buyer_id <> v_me THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.escrow_status <> 'held' THEN RAISE EXCEPTION 'There are no funds held for this order'; END IF;
  UPDATE public.transactions SET status = 'paid' WHERE order_id = p_order AND status = 'pending';
  UPDATE public.orders SET status = 'completed', escrow_status = 'released', confirmed_at = now(), payment_status = 'paid' WHERE id = p_order;
END; $$;
REVOKE ALL ON FUNCTION public.confirm_receipt(uuid) FROM anon;

-- Disputes --------------------------------------------------------------
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
  UPDATE public.orders SET status = 'disputed', escrow_status = CASE WHEN escrow_status = 'held' THEN 'disputed' ELSE escrow_status END WHERE id = p_order;
  UPDATE public.transactions SET status = 'disputed' WHERE order_id = p_order AND status = 'pending';
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.open_dispute(uuid,text,text) FROM anon;

CREATE OR REPLACE FUNCTION public.resolve_dispute(p_dispute uuid, p_outcome text, p_resolution text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); d RECORD;
BEGIN
  IF NOT public.has_role(v_me, 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT * INTO d FROM public.disputes WHERE id = p_dispute FOR UPDATE;
  IF d IS NULL THEN RAISE EXCEPTION 'Dispute not found'; END IF;
  IF p_outcome = 'refund_buyer' THEN
    UPDATE public.transactions SET status = 'refunded' WHERE order_id = d.order_id;
    UPDATE public.orders SET status = 'refunded', escrow_status = 'refunded', payment_status = 'refunded' WHERE id = d.order_id;
    UPDATE public.disputes SET status = 'refunded', resolution = p_resolution, resolved_by = v_me, resolved_at = now() WHERE id = p_dispute;
  ELSIF p_outcome = 'release_seller' THEN
    UPDATE public.transactions SET status = 'paid' WHERE order_id = d.order_id;
    UPDATE public.orders SET status = 'completed', escrow_status = 'released', payment_status = 'paid', confirmed_at = now() WHERE id = d.order_id;
    UPDATE public.disputes SET status = 'resolved', resolution = p_resolution, resolved_by = v_me, resolved_at = now() WHERE id = p_dispute;
  ELSIF p_outcome IN ('under_review','waiting_buyer','waiting_seller','closed') THEN
    UPDATE public.disputes SET status = p_outcome, resolution = coalesce(p_resolution, resolution) WHERE id = p_dispute;
  ELSE RAISE EXCEPTION 'Unknown outcome'; END IF;
END; $$;
REVOKE ALL ON FUNCTION public.resolve_dispute(uuid,text,text) FROM anon;

CREATE OR REPLACE FUNCTION public.set_withdrawal_status(p_withdrawal uuid, p_status text, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF p_status NOT IN ('pending','approved','paid','rejected') THEN RAISE EXCEPTION 'Unknown status'; END IF;
  UPDATE public.withdrawals SET status = p_status, admin_note = coalesce(p_note, admin_note),
    processed_at = CASE WHEN p_status IN ('paid','rejected') THEN now() ELSE processed_at END
  WHERE id = p_withdrawal;
END; $$;
REVOKE ALL ON FUNCTION public.set_withdrawal_status(uuid,text,text) FROM anon;
