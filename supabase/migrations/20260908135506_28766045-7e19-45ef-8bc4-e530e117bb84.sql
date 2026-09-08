-- Stage 3: affiliate commissions + referral rewards

CREATE TABLE IF NOT EXISTS public.reward_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('affiliate','referral')),
  entry_type text NOT NULL CHECK (entry_type IN ('commission','signup_bonus','first_order_bonus','adjustment')),
  amount numeric NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'NGN',
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('pending','available','reversed')),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  source_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.reward_entries TO authenticated;
GRANT ALL ON public.reward_entries TO service_role;
ALTER TABLE public.reward_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own rewards" ON public.reward_entries FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS reward_entries_user_idx ON public.reward_entries(user_id, kind, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS reward_entries_once_idx ON public.reward_entries(user_id, entry_type, order_id) WHERE order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS reward_entries_signup_idx ON public.reward_entries(user_id, source_user_id) WHERE entry_type = 'signup_bonus';

-- payouts split by source pot
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'sales';
DO $$ BEGIN
  ALTER TABLE public.withdrawals ADD CONSTRAINT withdrawals_kind_check CHECK (kind IN ('sales','affiliate','referral'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- admin-tunable settings
INSERT INTO public.platform_settings (key, value, description) VALUES
  ('affiliate_commission_rate', '0.02'::jsonb, 'Share of each completed order paid to the person who referred the buyer. 0.02 means 2%.'),
  ('referral_signup_reward', '0'::jsonb, 'Flat reward when someone you referred creates an account.'),
  ('referral_first_order_reward', '500'::jsonb, 'Flat reward when someone you referred completes their first order.')
ON CONFLICT (key) DO NOTHING;

-- balances per pot
CREATE OR REPLACE FUNCTION public.get_reward_balances(p_user uuid)
RETURNS TABLE(kind text, earned numeric, pending numeric, withdrawn numeric, pending_withdrawals numeric, available numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT k.kind,
    coalesce((SELECT sum(amount) FROM public.reward_entries r WHERE r.user_id = p_user AND r.kind = k.kind AND r.status IN ('available','pending')), 0),
    coalesce((SELECT sum(amount) FROM public.reward_entries r WHERE r.user_id = p_user AND r.kind = k.kind AND r.status = 'pending'), 0),
    coalesce((SELECT sum(amount) FROM public.withdrawals w WHERE w.seller_id = p_user AND w.kind = k.kind AND w.status = 'paid'), 0),
    coalesce((SELECT sum(amount) FROM public.withdrawals w WHERE w.seller_id = p_user AND w.kind = k.kind AND w.status IN ('pending','approved')), 0),
    coalesce((SELECT sum(amount) FROM public.reward_entries r WHERE r.user_id = p_user AND r.kind = k.kind AND r.status = 'available'), 0)
      - coalesce((SELECT sum(amount) FROM public.withdrawals w WHERE w.seller_id = p_user AND w.kind = k.kind AND w.status IN ('pending','approved','paid')), 0)
  FROM (VALUES ('affiliate'), ('referral')) AS k(kind);
$$;
REVOKE ALL ON FUNCTION public.get_reward_balances(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_reward_balances(uuid) TO authenticated;

-- payout requests now pick a pot
DROP FUNCTION IF EXISTS public.request_withdrawal(numeric, text, text);
CREATE OR REPLACE FUNCTION public.request_withdrawal(p_amount numeric, p_method text DEFAULT 'bank_transfer', p_destination text DEFAULT NULL, p_kind text DEFAULT 'sales')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); v_available numeric; v_id uuid; v_kind text := coalesce(p_kind,'sales');
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF v_kind NOT IN ('sales','affiliate','referral') THEN RAISE EXCEPTION 'Unknown balance'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Enter an amount above zero'; END IF;
  IF v_kind = 'sales' THEN
    SELECT available INTO v_available FROM public.get_seller_earnings(v_me);
  ELSE
    SELECT available INTO v_available FROM public.get_reward_balances(v_me) WHERE kind = v_kind;
  END IF;
  IF p_amount > coalesce(v_available, 0) THEN RAISE EXCEPTION 'You can withdraw at most %', to_char(coalesce(v_available,0), 'FM999,999,999,990.00'); END IF;
  INSERT INTO public.withdrawals (seller_id, amount, method, destination, kind)
  VALUES (v_me, p_amount, coalesce(p_method,'bank_transfer'), p_destination, v_kind)
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.request_withdrawal(numeric, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric, text, text, text) TO authenticated;

-- award rewards when an order's money is released
CREATE OR REPLACE FUNCTION public.award_referral_rewards(p_order uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o RECORD; v_ref uuid; v_cur text; v_rate numeric; v_amount numeric; v_first_reward numeric; v_prior int;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = p_order;
  IF o IS NULL THEN RETURN; END IF;
  SELECT referred_by INTO v_ref FROM public.profiles WHERE id = o.buyer_id;
  IF v_ref IS NULL OR v_ref = o.buyer_id THEN RETURN; END IF;
  SELECT a.currency INTO v_cur FROM public.ads a WHERE a.id = o.ad_id;
  v_cur := coalesce(v_cur, 'NGN');

  v_rate := public.setting_num('affiliate_commission_rate', 0.02);
  v_amount := round(greatest(o.total_price - coalesce(o.refunded_amount, 0), 0) * greatest(v_rate, 0), 2);
  IF v_amount > 0 THEN
    INSERT INTO public.reward_entries (user_id, kind, entry_type, amount, currency, order_id, source_user_id, note)
    VALUES (v_ref, 'affiliate', 'commission', v_amount, v_cur, o.id, o.buyer_id, 'Commission on a completed order by someone you referred')
    ON CONFLICT DO NOTHING;
    PERFORM public.notify(v_ref, 'reward', 'You earned a commission', 'A buyer you referred completed an order.', '/affiliate', NULL, 'order', o.id);
  END IF;

  SELECT count(*) INTO v_prior FROM public.orders x
    WHERE x.buyer_id = o.buyer_id AND x.id <> o.id AND x.escrow_status IN ('released','partially_refunded');
  IF v_prior = 0 THEN
    v_first_reward := public.setting_num('referral_first_order_reward', 0);
    IF v_first_reward > 0 THEN
      INSERT INTO public.reward_entries (user_id, kind, entry_type, amount, currency, order_id, source_user_id, note)
      VALUES (v_ref, 'referral', 'first_order_bonus', v_first_reward, v_cur, o.id, o.buyer_id, 'Reward: a friend you referred completed their first order')
      ON CONFLICT DO NOTHING;
      PERFORM public.notify(v_ref, 'reward', 'Referral reward unlocked', 'A friend you referred completed their first order.', '/affiliate', NULL, 'order', o.id);
    END IF;
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.award_referral_rewards(uuid) FROM PUBLIC, anon, authenticated;

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
  PERFORM public.award_referral_rewards(p_order);
END; $$;
REVOKE ALL ON FUNCTION public.release_escrow(uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;

-- signup reward for the referrer
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_username TEXT; v_display TEXT; v_ref TEXT; v_referrer UUID; v_click UUID; v_bonus numeric;
BEGIN
  v_username := lower(coalesce(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)));
  v_display := coalesce(NEW.raw_user_meta_data->>'display_name', v_username);
  v_ref := upper(nullif(trim(NEW.raw_user_meta_data->>'referral_code'), ''));
  IF v_ref IS NOT NULL THEN
    SELECT id INTO v_referrer FROM public.profiles WHERE affiliate_code = v_ref;
  END IF;
  IF v_referrer = NEW.id THEN v_referrer := NULL; END IF;
  INSERT INTO public.profiles (id, username, display_name, affiliate_code, referred_by)
  VALUES (NEW.id, v_username, v_display, public.generate_affiliate_code(), v_referrer);
  IF v_referrer IS NOT NULL THEN
    UPDATE public.profiles SET total_referrals = total_referrals + 1 WHERE id = v_referrer;
    v_click := nullif(NEW.raw_user_meta_data->>'affiliate_click_id', '')::uuid;
    IF v_click IS NOT NULL THEN
      UPDATE public.affiliate_clicks SET converted = true WHERE id = v_click AND affiliate_user_id = v_referrer;
    ELSE
      INSERT INTO public.affiliate_clicks (affiliate_user_id, converted) VALUES (v_referrer, true);
    END IF;
    v_bonus := public.setting_num('referral_signup_reward', 0);
    IF v_bonus > 0 THEN
      INSERT INTO public.reward_entries (user_id, kind, entry_type, amount, source_user_id, note)
      VALUES (v_referrer, 'referral', 'signup_bonus', v_bonus, NEW.id, 'Reward: a friend joined with your link')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  IF NEW.email IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_emails a WHERE lower(a.email) = lower(NEW.email)) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;