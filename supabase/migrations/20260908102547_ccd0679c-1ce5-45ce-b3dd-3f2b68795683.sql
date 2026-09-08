-- ROLES ---------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('buyer','seller','admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- SELLER PROFILES -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.seller_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  about text,
  contact_email text,
  contact_phone text,
  payout_method text NOT NULL DEFAULT 'bank_transfer',
  payout_account_name text,
  payout_account_last4 text,
  payout_bank text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.seller_profiles TO authenticated;
GRANT ALL ON public.seller_profiles TO service_role;
ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own seller profile" ON public.seller_profiles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "create own seller profile" ON public.seller_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "update own seller profile" ON public.seller_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER seller_profiles_updated_at BEFORE UPDATE ON public.seller_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ORDERS: escrow + fulfilment ----------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_number text,
  ADD COLUMN IF NOT EXISTS escrow_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS delivery_method text,
  ADD COLUMN IF NOT EXISTS delivery_address text,
  ADD COLUMN IF NOT EXISTS buyer_name text,
  ADD COLUMN IF NOT EXISTS buyer_phone text,
  ADD COLUMN IF NOT EXISTS tracking_note text,
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text LANGUAGE plpgsql SET search_path = public AS $$
DECLARE code text;
BEGIN
  LOOP
    code := 'PZ-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders WHERE order_number = code);
  END LOOP;
  RETURN code;
END; $$;

UPDATE public.orders SET order_number = public.generate_order_number() WHERE order_number IS NULL;

CREATE OR REPLACE FUNCTION public.orders_set_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.order_number IS NULL THEN NEW.order_number := public.generate_order_number(); END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER orders_set_number BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.orders_set_number();
CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_key ON public.orders(order_number);

CREATE TABLE IF NOT EXISTS public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id),
  status text NOT NULL,
  escrow_status text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.order_events TO authenticated;
GRANT ALL ON public.order_events TO service_role;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order parties read events" ON public.order_events FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid()))
  OR public.has_role(auth.uid(),'admin')
);
CREATE INDEX IF NOT EXISTS order_events_order_idx ON public.order_events(order_id, created_at);

CREATE OR REPLACE FUNCTION public.orders_log_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status OR NEW.escrow_status IS DISTINCT FROM OLD.escrow_status THEN
    INSERT INTO public.order_events (order_id, actor_id, status, escrow_status)
    VALUES (NEW.id, auth.uid(), NEW.status, NEW.escrow_status);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER orders_log_event AFTER INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.orders_log_event();

-- WITHDRAWALS ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'NGN',
  method text NOT NULL DEFAULT 'bank_transfer',
  destination text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own withdrawals" ON public.withdrawals FOR SELECT TO authenticated USING (seller_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage withdrawals" ON public.withdrawals FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER withdrawals_updated_at BEFORE UPDATE ON public.withdrawals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- DISPUTES ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  opened_by uuid NOT NULL REFERENCES public.profiles(id),
  buyer_id uuid NOT NULL REFERENCES public.profiles(id),
  seller_id uuid NOT NULL REFERENCES public.profiles(id),
  reason text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  resolution text,
  resolved_by uuid REFERENCES public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.disputes TO authenticated;
GRANT ALL ON public.disputes TO service_role;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dispute parties read" ON public.disputes FOR SELECT TO authenticated USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update disputes" ON public.disputes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER disputes_updated_at BEFORE UPDATE ON public.disputes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.dispute_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id),
  body text,
  file_url text,
  file_name text,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.dispute_messages TO authenticated;
GRANT ALL ON public.dispute_messages TO service_role;
ALTER TABLE public.dispute_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dispute parties read messages" ON public.dispute_messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.disputes d WHERE d.id = dispute_id AND (d.buyer_id = auth.uid() OR d.seller_id = auth.uid())) OR public.has_role(auth.uid(),'admin')
);
CREATE POLICY "dispute parties write messages" ON public.dispute_messages FOR INSERT TO authenticated WITH CHECK (
  author_id = auth.uid() AND (
    EXISTS (SELECT 1 FROM public.disputes d WHERE d.id = dispute_id AND (d.buyer_id = auth.uid() OR d.seller_id = auth.uid())) OR public.has_role(auth.uid(),'admin')
  )
);
CREATE INDEX IF NOT EXISTS dispute_messages_idx ON public.dispute_messages(dispute_id, created_at);

-- EARNINGS ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_seller_earnings(p_user uuid)
RETURNS TABLE(total_sales numeric, platform_fees numeric, escrow_held numeric, released numeric, withdrawn numeric, pending_withdrawals numeric, available numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH t AS (SELECT * FROM public.transactions WHERE payee_id = p_user),
  w AS (SELECT * FROM public.withdrawals WHERE seller_id = p_user)
  SELECT
    coalesce((SELECT sum(amount) FROM t WHERE status IN ('pending','paid')), 0),
    coalesce((SELECT sum(platform_fee) FROM t WHERE status IN ('pending','paid')), 0),
    coalesce((SELECT sum(seller_earnings) FROM t WHERE status = 'pending'), 0),
    coalesce((SELECT sum(seller_earnings) FROM t WHERE status = 'paid'), 0),
    coalesce((SELECT sum(amount) FROM w WHERE status = 'paid'), 0),
    coalesce((SELECT sum(amount) FROM w WHERE status IN ('pending','approved')), 0),
    coalesce((SELECT sum(seller_earnings) FROM t WHERE status = 'paid'), 0)
      - coalesce((SELECT sum(amount) FROM w WHERE status IN ('pending','approved','paid')), 0);
$$;

CREATE OR REPLACE FUNCTION public.request_withdrawal(p_amount numeric, p_method text DEFAULT 'bank_transfer', p_destination text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); v_available numeric; v_id uuid;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Enter an amount above zero'; END IF;
  SELECT available INTO v_available FROM public.get_seller_earnings(v_me);
  IF p_amount > v_available THEN RAISE EXCEPTION 'You can withdraw at most %', to_char(v_available, 'FM999,999,999,990.00'); END IF;
  INSERT INTO public.withdrawals (seller_id, amount, method, destination)
  VALUES (v_me, p_amount, coalesce(p_method,'bank_transfer'), p_destination)
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
