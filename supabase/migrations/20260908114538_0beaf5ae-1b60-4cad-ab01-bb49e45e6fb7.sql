-- Coupons -------------------------------------------------------------
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  scope text NOT NULL DEFAULT 'seller' CHECK (scope IN ('seller','platform')),
  discount_type text NOT NULL CHECK (discount_type IN ('percent','fixed')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  max_discount numeric CHECK (max_discount IS NULL OR max_discount > 0),
  currency text,
  min_order_value numeric NOT NULL DEFAULT 0 CHECK (min_order_value >= 0),
  max_uses integer CHECK (max_uses IS NULL OR max_uses > 0),
  per_user_limit integer DEFAULT 1 CHECK (per_user_limit IS NULL OR per_user_limit > 0),
  used_count integer NOT NULL DEFAULT 0,
  ad_id uuid REFERENCES public.ads(id) ON DELETE CASCADE,
  category text,
  first_order_only boolean NOT NULL DEFAULT false,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  description text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (discount_type <> 'percent' OR discount_value <= 100),
  CHECK (scope <> 'seller' OR owner_id IS NOT NULL),
  CHECK (scope <> 'platform' OR owner_id IS NULL)
);
CREATE UNIQUE INDEX coupons_code_key ON public.coupons (upper(code));
CREATE INDEX coupons_owner_idx ON public.coupons (owner_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coupons_select_owner_or_admin" ON public.coupons FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "coupons_insert" ON public.coupons FOR INSERT TO authenticated
  WITH CHECK (
    (scope = 'seller' AND owner_id = auth.uid()
      AND EXISTS (SELECT 1 FROM public.seller_profiles sp WHERE sp.user_id = auth.uid() AND sp.status = 'active')
      AND (ad_id IS NULL OR EXISTS (SELECT 1 FROM public.ads a WHERE a.id = ad_id AND a.seller_id = auth.uid())))
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "coupons_update" ON public.coupons FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (
    (scope = 'seller' AND owner_id = auth.uid()
      AND (ad_id IS NULL OR EXISTS (SELECT 1 FROM public.ads a WHERE a.id = ad_id AND a.seller_id = auth.uid())))
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "coupons_delete" ON public.coupons FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.coupons_normalize()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.code := upper(regexp_replace(trim(NEW.code), '\s+', '', 'g'));
  IF length(NEW.code) < 3 OR length(NEW.code) > 24 THEN RAISE EXCEPTION 'Coupon codes must be 3–24 characters'; END IF;
  IF NEW.code !~ '^[A-Z0-9_-]+$' THEN RAISE EXCEPTION 'Use only letters, numbers, dashes or underscores in the code'; END IF;
  IF TG_OP = 'UPDATE' THEN NEW.used_count := OLD.used_count; NEW.updated_at := now(); END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER coupons_normalize BEFORE INSERT OR UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.coupons_normalize();
REVOKE ALL ON FUNCTION public.coupons_normalize() FROM PUBLIC, anon, authenticated;

-- Redemptions ---------------------------------------------------------
CREATE TABLE public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  discount_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id)
);
CREATE INDEX coupon_redemptions_coupon_idx ON public.coupon_redemptions (coupon_id);
CREATE INDEX coupon_redemptions_user_idx ON public.coupon_redemptions (user_id);
GRANT SELECT ON public.coupon_redemptions TO authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "redemptions_select" ON public.coupon_redemptions FOR SELECT TO authenticated
  USING (user_id = auth.uid()
     OR EXISTS (SELECT 1 FROM public.coupons c WHERE c.id = coupon_id AND c.owner_id = auth.uid())
     OR public.has_role(auth.uid(), 'admin'));

-- Orders: discount columns -------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subtotal numeric,
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;
UPDATE public.orders SET subtotal = total_price WHERE subtotal IS NULL;

-- Quote a coupon for a given listing/quantity/user (internal) ----------
CREATE OR REPLACE FUNCTION public.coupon_quote(p_code text, p_ad uuid, p_quantity integer, p_user uuid)
RETURNS TABLE(coupon_id uuid, code text, subtotal numeric, discount numeric, total numeric, label text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c RECORD; a RECORD; v_sub numeric; v_disc numeric; v_uses integer; v_paid integer; v_qty integer := greatest(coalesce(p_quantity,1),1);
BEGIN
  SELECT * INTO a FROM public.ads WHERE id = p_ad AND status = 'active';
  IF a IS NULL THEN RAISE EXCEPTION 'This listing is no longer available'; END IF;
  v_sub := a.price * v_qty;
  SELECT * INTO c FROM public.coupons cp WHERE upper(cp.code) = upper(regexp_replace(trim(coalesce(p_code,'')), '\s+', '', 'g'));
  IF c IS NULL OR NOT c.is_active THEN RAISE EXCEPTION 'That coupon code is not valid'; END IF;
  IF c.starts_at > now() THEN RAISE EXCEPTION 'This coupon is not active yet'; END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN RAISE EXCEPTION 'This coupon has expired'; END IF;
  IF c.scope = 'seller' AND c.owner_id <> a.seller_id THEN RAISE EXCEPTION 'This coupon does not apply to this seller''s items'; END IF;
  IF c.ad_id IS NOT NULL AND c.ad_id <> p_ad THEN RAISE EXCEPTION 'This coupon is for a different item'; END IF;
  IF c.category IS NOT NULL AND c.category <> a.category THEN RAISE EXCEPTION 'This coupon does not apply to this category'; END IF;
  IF c.currency IS NOT NULL AND c.currency <> a.currency THEN RAISE EXCEPTION 'This coupon is for a different currency'; END IF;
  IF v_sub < c.min_order_value THEN RAISE EXCEPTION 'This coupon needs a minimum order of %', c.min_order_value; END IF;
  IF c.max_uses IS NOT NULL AND c.used_count >= c.max_uses THEN RAISE EXCEPTION 'This coupon has been fully used'; END IF;
  IF p_user IS NOT NULL THEN
    IF a.seller_id = p_user THEN RAISE EXCEPTION 'You cannot use a coupon on your own listing'; END IF;
    SELECT count(*) INTO v_uses FROM public.coupon_redemptions r WHERE r.coupon_id = c.id AND r.user_id = p_user;
    IF c.per_user_limit IS NOT NULL AND v_uses >= c.per_user_limit THEN RAISE EXCEPTION 'You have already used this coupon'; END IF;
    IF c.first_order_only THEN
      SELECT count(*) INTO v_paid FROM public.orders o WHERE o.buyer_id = p_user AND o.payment_status = 'paid';
      IF v_paid > 0 THEN RAISE EXCEPTION 'This coupon is only for your first order'; END IF;
    END IF;
  END IF;
  IF c.discount_type = 'percent' THEN v_disc := round(v_sub * c.discount_value / 100, 2); ELSE v_disc := c.discount_value; END IF;
  IF c.max_discount IS NOT NULL THEN v_disc := least(v_disc, c.max_discount); END IF;
  v_disc := least(v_disc, v_sub);
  RETURN QUERY SELECT c.id, c.code, v_sub, v_disc, v_sub - v_disc,
    CASE WHEN c.discount_type = 'percent' THEN c.discount_value::text || '% off' ELSE 'Fixed discount' END;
END; $$;
REVOKE ALL ON FUNCTION public.coupon_quote(text,uuid,integer,uuid) FROM PUBLIC, anon, authenticated;

-- Buyer-facing check --------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_coupon(p_code text, p_ad uuid, p_quantity integer DEFAULT 1)
RETURNS TABLE(coupon_id uuid, code text, subtotal numeric, discount numeric, total numeric, label text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  RETURN QUERY SELECT * FROM public.coupon_quote(p_code, p_ad, p_quantity, auth.uid());
END; $$;
REVOKE ALL ON FUNCTION public.validate_coupon(text,uuid,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text,uuid,integer) TO authenticated;

-- place_order with coupon --------------------------------------------
DROP FUNCTION IF EXISTS public.place_order(uuid,integer,text,text,text,text,text);
CREATE OR REPLACE FUNCTION public.place_order(
  p_ad uuid, p_quantity integer DEFAULT 1, p_delivery_method text DEFAULT 'digital',
  p_delivery_address text DEFAULT NULL, p_buyer_name text DEFAULT NULL, p_buyer_phone text DEFAULT NULL, p_notes text DEFAULT NULL,
  p_coupon_code text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); v_ad RECORD; v_order uuid; v_sub numeric; v_disc numeric := 0; v_coupon uuid; q RECORD;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_quantity IS NULL OR p_quantity < 1 THEN RAISE EXCEPTION 'Quantity must be at least 1'; END IF;
  SELECT * INTO v_ad FROM public.ads WHERE id = p_ad AND status = 'active';
  IF v_ad IS NULL THEN RAISE EXCEPTION 'This listing is no longer available'; END IF;
  IF v_ad.seller_id = v_me THEN RAISE EXCEPTION 'You cannot buy your own listing'; END IF;
  v_sub := v_ad.price * p_quantity;
  IF nullif(trim(coalesce(p_coupon_code,'')),'') IS NOT NULL THEN
    SELECT * INTO q FROM public.coupon_quote(p_coupon_code, p_ad, p_quantity, v_me);
    v_coupon := q.coupon_id; v_disc := q.discount;
  END IF;
  INSERT INTO public.orders (ad_id, buyer_id, seller_id, quantity, subtotal, discount_amount, coupon_id, total_price, status, payment_status, escrow_status,
                             delivery_method, delivery_address, buyer_name, buyer_phone, notes)
  VALUES (p_ad, v_me, v_ad.seller_id, p_quantity, v_sub, v_disc, v_coupon, v_sub - v_disc, 'pending', 'pending', 'none',
          coalesce(p_delivery_method,'digital'), nullif(trim(coalesce(p_delivery_address,'')),''), nullif(trim(coalesce(p_buyer_name,'')),''),
          nullif(trim(coalesce(p_buyer_phone,'')),''), nullif(trim(coalesce(p_notes,'')),''))
  RETURNING id INTO v_order;
  RETURN v_order;
END; $$;
REVOKE ALL ON FUNCTION public.place_order(uuid,integer,text,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_order(uuid,integer,text,text,text,text,text,text) TO authenticated;

-- Payment records the redemption --------------------------------------
CREATE OR REPLACE FUNCTION public.pay_order_test_mode(p_order uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); o RECORD; v_cur text; v_tx uuid; c RECORD;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO o FROM public.orders WHERE id = p_order FOR UPDATE;
  IF o IS NULL OR o.buyer_id <> v_me THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.payment_status = 'paid' THEN RAISE EXCEPTION 'This order is already paid'; END IF;
  IF o.status = 'cancelled' THEN RAISE EXCEPTION 'This order was cancelled'; END IF;
  IF o.coupon_id IS NOT NULL THEN
    SELECT * INTO c FROM public.coupons WHERE id = o.coupon_id FOR UPDATE;
    IF c IS NULL OR NOT c.is_active OR (c.expires_at IS NOT NULL AND c.expires_at < now()) THEN RAISE EXCEPTION 'The coupon on this order is no longer valid'; END IF;
    IF c.max_uses IS NOT NULL AND c.used_count >= c.max_uses THEN RAISE EXCEPTION 'This coupon has been fully used'; END IF;
    INSERT INTO public.coupon_redemptions (coupon_id, user_id, order_id, discount_amount) VALUES (c.id, v_me, p_order, o.discount_amount);
    UPDATE public.coupons SET used_count = used_count + 1 WHERE id = c.id;
  END IF;
  SELECT currency INTO v_cur FROM public.ads WHERE id = o.ad_id;
  INSERT INTO public.transactions (order_id, payer_id, payee_id, amount, platform_fee, seller_earnings, currency, status, reference, provider)
  VALUES (p_order, o.buyer_id, o.seller_id, o.total_price, 0, 0, coalesce(v_cur,'NGN'), 'pending',
          'TEST-' || upper(substr(md5(random()::text), 1, 10)), 'test_mode')
  RETURNING id INTO v_tx;
  UPDATE public.orders SET payment_status = 'paid', escrow_status = 'held', status = 'accepted' WHERE id = p_order;
  PERFORM public.log_escrow(p_order, 'hold', o.total_price, 'Payment received and held in escrow', v_me);
  RETURN v_tx;
END; $$;