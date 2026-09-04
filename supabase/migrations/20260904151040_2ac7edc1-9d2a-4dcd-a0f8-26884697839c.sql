-- ========= Messages: delivery / read timestamps =========
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

CREATE OR REPLACE FUNCTION public.messages_sync_read_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.read = true AND OLD.read = false THEN
    NEW.read_at := coalesce(NEW.read_at, now());
    NEW.delivered_at := coalesce(NEW.delivered_at, NEW.read_at);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS messages_sync_read_at ON public.messages;
CREATE TRIGGER messages_sync_read_at BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.messages_sync_read_at();

CREATE OR REPLACE FUNCTION public.mark_messages_delivered()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 0; END IF;
  UPDATE public.messages SET delivered_at = now()
  WHERE receiver_id = auth.uid() AND delivered_at IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END; $$;

-- ========= Presence =========
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS show_last_seen boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.touch_last_seen()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles SET last_seen_at = now() WHERE id = auth.uid();
$$;

-- ========= Payments foundation =========
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';

CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  payer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount >= 0),
  platform_fee numeric NOT NULL DEFAULT 0,
  seller_earnings numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'NGN',
  status text NOT NULL DEFAULT 'pending',
  reference text NOT NULL UNIQUE,
  provider text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY transactions_party_read ON public.transactions FOR SELECT TO authenticated
  USING (auth.uid() = payer_id OR auth.uid() = payee_id);
CREATE INDEX IF NOT EXISTS transactions_order_idx ON public.transactions(order_id);
DROP TRIGGER IF EXISTS transactions_updated_at ON public.transactions;
CREATE TRIGGER transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.platform_fee_rate()
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$ SELECT 0.05::numeric $$;

CREATE OR REPLACE FUNCTION public.transactions_compute_fee()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.platform_fee := round(NEW.amount * public.platform_fee_rate(), 2);
  NEW.seller_earnings := NEW.amount - NEW.platform_fee;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS transactions_compute_fee ON public.transactions;
CREATE TRIGGER transactions_compute_fee BEFORE INSERT OR UPDATE OF amount ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.transactions_compute_fee();

-- ========= Notifications =========
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_owner_read ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY notifications_owner_update ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON public.notifications(user_id) WHERE read_at IS NULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.notifications SET read_at = now() WHERE user_id = auth.uid() AND read_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.notify(p_user uuid, p_type text, p_title text, p_body text, p_link text, p_actor uuid DEFAULT NULL, p_entity_type text DEFAULT NULL, p_entity_id uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_user IS NULL OR p_user = p_actor THEN RETURN; END IF;
  INSERT INTO public.notifications (user_id, actor_id, type, title, body, link, entity_type, entity_id)
  VALUES (p_user, p_actor, p_type, p_title, p_body, p_link, p_entity_type, p_entity_id);
END; $$;

CREATE OR REPLACE FUNCTION public.display_name_of(p_user uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((SELECT display_name FROM public.profiles WHERE id = p_user), 'Someone');
$$;

-- messages
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.content LIKE 'Offer:%' OR NEW.content LIKE 'Counter-offer%' OR NEW.content LIKE 'Offer accepted%' OR NEW.content LIKE 'Offer declined%' OR NEW.content LIKE 'Offer withdrawn%' THEN
    RETURN NEW; -- negotiation triggers cover these
  END IF;
  PERFORM public.notify(NEW.receiver_id, 'new_message', public.display_name_of(NEW.sender_id) || ' sent you a message',
    left(NEW.content, 120), '/messages?c=' || NEW.conversation_id, NEW.sender_id, 'conversation', NEW.conversation_id);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS messages_notify ON public.messages;
CREATE TRIGGER messages_notify AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

-- negotiations
CREATE OR REPLACE FUNCTION public.notify_negotiation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_title text; v_other uuid; v_link text; v_ad text; v_price text; v_type text;
BEGIN
  SELECT title, currency INTO v_ad, v_price FROM public.ads WHERE id = NEW.ad_id;
  v_price := coalesce(v_price, 'NGN') || ' ' || to_char(NEW.offered_price, 'FM999,999,999,990.00');
  v_link := CASE WHEN NEW.conversation_id IS NOT NULL THEN '/messages?c=' || NEW.conversation_id ELSE '/orders' END;
  v_other := CASE WHEN NEW.last_actor_id = NEW.buyer_id THEN NEW.seller_id ELSE NEW.buyer_id END;
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify(NEW.seller_id, 'new_offer', public.display_name_of(NEW.buyer_id) || ' made an offer',
      v_price || ' for "' || coalesce(v_ad, 'your ad') || '"', v_link, NEW.buyer_id, 'negotiation', NEW.id);
    RETURN NEW;
  END IF;
  IF NEW.status = OLD.status AND NEW.round_number = OLD.round_number THEN RETURN NEW; END IF;
  IF NEW.status = 'accepted' THEN v_type := 'offer_accepted'; v_title := 'Offer accepted';
  ELSIF NEW.status = 'declined' THEN v_type := 'offer_rejected'; v_title := 'Offer declined';
  ELSIF NEW.status = 'countered' THEN v_type := 'counter_offer'; v_title := 'Counter-offer received (round ' || NEW.round_number || ')';
  ELSIF NEW.status = 'expired' THEN v_type := 'offer_expired'; v_title := 'Offer expired';
    PERFORM public.notify(NEW.buyer_id, v_type, v_title, v_price || ' for "' || coalesce(v_ad, 'ad') || '"', v_link, NULL, 'negotiation', NEW.id);
    PERFORM public.notify(NEW.seller_id, v_type, v_title, v_price || ' for "' || coalesce(v_ad, 'ad') || '"', v_link, NULL, 'negotiation', NEW.id);
    RETURN NEW;
  ELSE RETURN NEW; END IF;
  PERFORM public.notify(v_other, v_type, v_title, v_price || ' for "' || coalesce(v_ad, 'ad') || '"', v_link, NEW.last_actor_id, 'negotiation', NEW.id);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS negotiations_notify ON public.negotiations;
CREATE TRIGGER negotiations_notify AFTER INSERT OR UPDATE ON public.negotiations FOR EACH ROW EXECUTE FUNCTION public.notify_negotiation();

-- friend requests
CREATE OR REPLACE FUNCTION public.notify_friend_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify(NEW.receiver_id, 'friend_request', public.display_name_of(NEW.sender_id) || ' sent you a friend request',
      NULL, '/friends', NEW.sender_id, 'friend_request', NEW.id);
  ELSIF NEW.status = 'accepted' AND OLD.status <> 'accepted' THEN
    SELECT username INTO v_name FROM public.profiles WHERE id = NEW.receiver_id;
    PERFORM public.notify(NEW.sender_id, 'friend_request_accepted', public.display_name_of(NEW.receiver_id) || ' accepted your friend request',
      NULL, '/user/' || coalesce(v_name, ''), NEW.receiver_id, 'profile', NEW.receiver_id);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS friend_requests_notify ON public.friend_requests;
CREATE TRIGGER friend_requests_notify AFTER INSERT OR UPDATE ON public.friend_requests FOR EACH ROW EXECUTE FUNCTION public.notify_friend_request();

-- orders
CREATE OR REPLACE FUNCTION public.notify_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ad text; v_actor uuid := auth.uid(); v_target uuid;
BEGIN
  SELECT title INTO v_ad FROM public.ads WHERE id = NEW.ad_id;
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify(NEW.seller_id, 'new_order', public.display_name_of(NEW.buyer_id) || ' placed an order',
      coalesce(v_ad, 'Your ad') || ' × ' || NEW.quantity, '/orders', NEW.buyer_id, 'order', NEW.id);
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    v_target := CASE WHEN v_actor = NEW.seller_id THEN NEW.buyer_id WHEN v_actor = NEW.buyer_id THEN NEW.seller_id ELSE NULL END;
    IF v_target IS NULL THEN
      PERFORM public.notify(NEW.buyer_id, 'order_status', 'Order ' || NEW.status, coalesce(v_ad, 'Order'), '/orders', NULL, 'order', NEW.id);
      PERFORM public.notify(NEW.seller_id, 'order_status', 'Order ' || NEW.status, coalesce(v_ad, 'Order'), '/orders', NULL, 'order', NEW.id);
    ELSE
      PERFORM public.notify(v_target, 'order_status', 'Order ' || NEW.status, coalesce(v_ad, 'Order'), '/orders', v_actor, 'order', NEW.id);
    END IF;
  END IF;
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    PERFORM public.notify(NEW.buyer_id, 'payment_status', 'Payment ' || NEW.payment_status, coalesce(v_ad, 'Order'), '/orders', NULL, 'order', NEW.id);
    PERFORM public.notify(NEW.seller_id, 'payment_status', 'Payment ' || NEW.payment_status, coalesce(v_ad, 'Order'), '/orders', NULL, 'order', NEW.id);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS orders_notify ON public.orders;
CREATE TRIGGER orders_notify AFTER INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.notify_order();

-- transactions -> payment notifications + mirror onto order
CREATE OR REPLACE FUNCTION public.notify_transaction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_amt text := NEW.currency || ' ' || to_char(NEW.amount, 'FM999,999,999,990.00');
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.status = 'paid' THEN
    PERFORM public.notify(NEW.payer_id, 'payment_sent', 'Payment sent', v_amt, '/orders', NULL, 'transaction', NEW.id);
    PERFORM public.notify(NEW.payee_id, 'payment_received', 'Payment received',
      v_amt || ' (you earn ' || NEW.currency || ' ' || to_char(NEW.seller_earnings, 'FM999,999,999,990.00') || ' after fees)', '/orders', NULL, 'transaction', NEW.id);
  ELSIF NEW.status IN ('refunded', 'disputed') THEN
    PERFORM public.notify(NEW.payer_id, 'refund_dispute', 'Payment ' || NEW.status, v_amt, '/orders', NULL, 'transaction', NEW.id);
    PERFORM public.notify(NEW.payee_id, 'refund_dispute', 'Payment ' || NEW.status, v_amt, '/orders', NULL, 'transaction', NEW.id);
  ELSE
    PERFORM public.notify(NEW.payer_id, 'payment_status', 'Payment ' || NEW.status, v_amt, '/orders', NULL, 'transaction', NEW.id);
  END IF;
  IF NEW.order_id IS NOT NULL THEN
    UPDATE public.orders SET payment_status = CASE WHEN NEW.status IN ('paid','refunded','failed','pending') THEN NEW.status ELSE payment_status END WHERE id = NEW.order_id;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS transactions_notify ON public.transactions;
CREATE TRIGGER transactions_notify AFTER INSERT OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.notify_transaction();

-- friend posted a new ad
CREATE OR REPLACE FUNCTION public.notify_friend_new_ad()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE f RECORD;
BEGIN
  IF NEW.status <> 'active' THEN RETURN NEW; END IF;
  FOR f IN SELECT CASE WHEN user_one = NEW.seller_id THEN user_two ELSE user_one END AS friend
           FROM public.friendships WHERE user_one = NEW.seller_id OR user_two = NEW.seller_id LOOP
    PERFORM public.notify(f.friend, 'friend_new_ad', public.display_name_of(NEW.seller_id) || ' posted a new ad',
      NEW.title, '/ad/' || NEW.id, NEW.seller_id, 'ad', NEW.id);
  END LOOP;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS ads_notify_friends ON public.ads;
CREATE TRIGGER ads_notify_friends AFTER INSERT ON public.ads FOR EACH ROW EXECUTE FUNCTION public.notify_friend_new_ad();