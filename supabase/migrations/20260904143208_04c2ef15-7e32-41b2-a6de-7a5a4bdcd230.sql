-- ===== Ads: subcategory + dynamic details =====
ALTER TABLE public.ads
  ADD COLUMN subcategory TEXT,
  ADD COLUMN details JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ===== Saved contacts (address book for top-ups) =====
CREATE TABLE public.saved_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  provider TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, phone_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_contacts TO authenticated;
GRANT ALL ON public.saved_contacts TO service_role;
ALTER TABLE public.saved_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY saved_contacts_owner_select ON public.saved_contacts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY saved_contacts_owner_insert ON public.saved_contacts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY saved_contacts_owner_update ON public.saved_contacts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY saved_contacts_owner_delete ON public.saved_contacts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX saved_contacts_user_idx ON public.saved_contacts(user_id);

-- ===== Top-up orders: recipient type =====
ALTER TABLE public.data_airtime_orders
  ADD COLUMN recipient TEXT NOT NULL DEFAULT 'self' CHECK (recipient IN ('self', 'others'));

-- ===== Negotiations =====
CREATE TABLE public.negotiations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  original_price NUMERIC NOT NULL,
  offered_price NUMERIC NOT NULL,
  previous_price NUMERIC,
  counter_offer_price NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'countered', 'expired')),
  message TEXT,
  round_number INTEGER NOT NULL DEFAULT 1 CHECK (round_number BETWEEN 1 AND 5),
  last_actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '48 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.negotiations TO authenticated;
GRANT ALL ON public.negotiations TO service_role;
ALTER TABLE public.negotiations ENABLE ROW LEVEL SECURITY;
CREATE POLICY negotiations_party_read ON public.negotiations FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE INDEX negotiations_ad_idx ON public.negotiations(ad_id);
CREATE INDEX negotiations_conversation_idx ON public.negotiations(conversation_id);
CREATE INDEX negotiations_buyer_idx ON public.negotiations(buyer_id);
CREATE INDEX negotiations_seller_idx ON public.negotiations(seller_id);
CREATE TRIGGER negotiations_updated_at BEFORE UPDATE ON public.negotiations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.negotiations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.negotiations;

-- Expire stale open offers (called lazily by the RPCs)
CREATE OR REPLACE FUNCTION public.expire_stale_negotiations()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.negotiations SET status = 'expired'
  WHERE status IN ('pending', 'countered') AND expires_at < now();
$$;
REVOKE ALL ON FUNCTION public.expire_stale_negotiations() FROM PUBLIC, anon, authenticated;

-- Buyer opens an offer on an ad
CREATE OR REPLACE FUNCTION public.make_offer(p_ad UUID, p_price NUMERIC, p_message TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_me UUID := auth.uid(); v_ad RECORD; v_conv UUID; v_id UUID; v_msg TEXT;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM public.expire_stale_negotiations();
  SELECT * INTO v_ad FROM public.ads WHERE id = p_ad AND status = 'active';
  IF v_ad IS NULL THEN RAISE EXCEPTION 'This ad is not available'; END IF;
  IF v_ad.seller_id = v_me THEN RAISE EXCEPTION 'You cannot make an offer on your own ad'; END IF;
  IF p_price IS NULL OR p_price <= 0 THEN RAISE EXCEPTION 'Enter an offer above zero'; END IF;
  IF p_price >= v_ad.price THEN RAISE EXCEPTION 'Your offer must be below the listed price'; END IF;
  IF EXISTS (SELECT 1 FROM public.negotiations WHERE ad_id = p_ad AND buyer_id = v_me AND status IN ('pending', 'countered')) THEN
    RAISE EXCEPTION 'You already have an open offer on this ad';
  END IF;
  v_conv := public.get_or_create_conversation(v_ad.seller_id);
  INSERT INTO public.negotiations (ad_id, conversation_id, buyer_id, seller_id, original_price, offered_price, message, last_actor_id)
  VALUES (p_ad, v_conv, v_me, v_ad.seller_id, v_ad.price, p_price, nullif(trim(p_message), ''), v_me)
  RETURNING id INTO v_id;
  v_msg := 'Offer: ' || v_ad.currency || ' ' || to_char(p_price, 'FM999,999,999,990.00') || ' for "' || v_ad.title || '"';
  IF nullif(trim(p_message), '') IS NOT NULL THEN v_msg := v_msg || E'\n' || trim(p_message); END IF;
  INSERT INTO public.messages (conversation_id, sender_id, receiver_id, content) VALUES (v_conv, v_me, v_ad.seller_id, v_msg);
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.make_offer(UUID, NUMERIC, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.make_offer(UUID, NUMERIC, TEXT) TO authenticated;

-- Either party responds: accept / decline / counter
CREATE OR REPLACE FUNCTION public.respond_to_offer(p_negotiation UUID, p_action TEXT, p_price NUMERIC DEFAULT NULL, p_message TEXT DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_me UUID := auth.uid(); n RECORD; v_ad RECORD; v_other UUID; v_order UUID; v_msg TEXT;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM public.expire_stale_negotiations();
  SELECT * INTO n FROM public.negotiations WHERE id = p_negotiation FOR UPDATE;
  IF n IS NULL OR (n.buyer_id <> v_me AND n.seller_id <> v_me) THEN RAISE EXCEPTION 'Offer not found'; END IF;
  IF n.status NOT IN ('pending', 'countered') THEN RAISE EXCEPTION 'This offer is already %', n.status; END IF;
  SELECT * INTO v_ad FROM public.ads WHERE id = n.ad_id;
  v_other := CASE WHEN v_me = n.buyer_id THEN n.seller_id ELSE n.buyer_id END;

  IF p_action = 'decline' THEN
    UPDATE public.negotiations SET status = 'declined', last_actor_id = v_me,
      message = coalesce(nullif(trim(p_message), ''), message) WHERE id = n.id;
    v_msg := CASE WHEN v_me = n.last_actor_id THEN 'Offer withdrawn' ELSE 'Offer declined' END
      || ' (' || v_ad.currency || ' ' || to_char(n.offered_price, 'FM999,999,999,990.00') || ')';
  ELSIF v_me = n.last_actor_id THEN
    RAISE EXCEPTION 'Waiting for the other party to respond';
  ELSIF p_action = 'accept' THEN
    IF v_ad.status <> 'active' THEN RAISE EXCEPTION 'This ad is no longer available'; END IF;
    INSERT INTO public.orders (ad_id, buyer_id, seller_id, quantity, total_price, status, notes)
    VALUES (n.ad_id, n.buyer_id, n.seller_id, 1, n.offered_price, 'accepted', 'Price agreed via negotiation (round ' || n.round_number || ')')
    RETURNING id INTO v_order;
    UPDATE public.negotiations SET status = 'accepted', order_id = v_order, last_actor_id = v_me WHERE id = n.id;
    v_msg := 'Offer accepted at ' || v_ad.currency || ' ' || to_char(n.offered_price, 'FM999,999,999,990.00') || '. An order has been created.';
  ELSIF p_action = 'counter' THEN
    IF n.round_number >= 5 THEN RAISE EXCEPTION 'Maximum of 5 negotiation rounds reached'; END IF;
    IF p_price IS NULL OR p_price <= 0 THEN RAISE EXCEPTION 'Enter a counter-offer above zero'; END IF;
    IF p_price = n.offered_price THEN RAISE EXCEPTION 'Counter-offer must differ from the current offer'; END IF;
    UPDATE public.negotiations SET
      previous_price = n.offered_price,
      counter_offer_price = p_price,
      offered_price = p_price,
      round_number = n.round_number + 1,
      status = 'countered',
      message = nullif(trim(p_message), ''),
      last_actor_id = v_me,
      expires_at = now() + interval '48 hours'
    WHERE id = n.id;
    v_msg := 'Counter-offer (round ' || (n.round_number + 1) || '): ' || v_ad.currency || ' ' || to_char(p_price, 'FM999,999,999,990.00');
    IF nullif(trim(p_message), '') IS NOT NULL THEN v_msg := v_msg || E'\n' || trim(p_message); END IF;
  ELSE
    RAISE EXCEPTION 'Unknown action';
  END IF;

  IF n.conversation_id IS NOT NULL THEN
    INSERT INTO public.messages (conversation_id, sender_id, receiver_id, content) VALUES (n.conversation_id, v_me, v_other, v_msg);
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.respond_to_offer(UUID, TEXT, NUMERIC, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_offer(UUID, TEXT, NUMERIC, TEXT) TO authenticated;