-- ========== helper: updated_at ==========
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ========== profiles ==========
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT CHECK (bio IS NULL OR char_length(bio) <= 300),
  affiliate_code TEXT UNIQUE NOT NULL,
  referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  total_referrals INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_check_in DATE,
  phone_number TEXT,
  notification_prefs JSONB NOT NULL DEFAULT '{"messages":true,"orders":true,"friend_requests":true}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX profiles_username_idx ON public.profiles (username);
CREATE INDEX profiles_affiliate_code_idx ON public.profiles (affiliate_code);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_owner_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.profiles_lowercase_username()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.username = lower(NEW.username); RETURN NEW; END; $$;
CREATE TRIGGER profiles_lowercase_username BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.profiles_lowercase_username();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Prevent owners from editing protected counters directly
CREATE OR REPLACE FUNCTION public.profiles_protect_counters()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_setting('role', true) = 'authenticated' THEN
    NEW.affiliate_code := OLD.affiliate_code;
    NEW.referred_by := OLD.referred_by;
    NEW.total_referrals := OLD.total_referrals;
    NEW.current_streak := OLD.current_streak;
    NEW.longest_streak := OLD.longest_streak;
    NEW.last_check_in := OLD.last_check_in;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER profiles_protect_counters BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.profiles_protect_counters();

-- ========== affiliate_clicks ==========
CREATE TABLE public.affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_hash TEXT,
  converted BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX affiliate_clicks_user_idx ON public.affiliate_clicks (affiliate_user_id);
GRANT SELECT ON public.affiliate_clicks TO authenticated;
GRANT ALL ON public.affiliate_clicks TO service_role;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "affiliate_clicks_owner_read" ON public.affiliate_clicks FOR SELECT TO authenticated USING (auth.uid() = affiliate_user_id);

-- ========== signup trigger ==========
CREATE OR REPLACE FUNCTION public.generate_affiliate_code()
RETURNS TEXT LANGUAGE plpgsql SET search_path = public AS $$
DECLARE chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; code TEXT; i INT;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..8 LOOP code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1); END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE affiliate_code = code);
  END LOOP;
  RETURN code;
END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_username TEXT; v_display TEXT; v_ref TEXT; v_referrer UUID; v_click UUID;
BEGIN
  v_username := lower(coalesce(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)));
  v_display := coalesce(NEW.raw_user_meta_data->>'display_name', v_username);
  v_ref := upper(nullif(trim(NEW.raw_user_meta_data->>'referral_code'), ''));
  IF v_ref IS NOT NULL THEN
    SELECT id INTO v_referrer FROM public.profiles WHERE affiliate_code = v_ref;
  END IF;
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
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- username availability (anon-callable, returns boolean only)
CREATE OR REPLACE FUNCTION public.is_username_available(p_username TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles WHERE username = lower(trim(p_username)));
$$;
GRANT EXECUTE ON FUNCTION public.is_username_available(TEXT) TO anon, authenticated;

-- record affiliate click (anon-callable), returns click id
CREATE OR REPLACE FUNCTION public.record_affiliate_click(p_code TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user UUID; v_id UUID;
BEGIN
  SELECT id INTO v_user FROM public.profiles WHERE affiliate_code = upper(trim(p_code));
  IF v_user IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.affiliate_clicks (affiliate_user_id) VALUES (v_user) RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.record_affiliate_click(TEXT) TO anon, authenticated;

-- ========== ads ==========
CREATE TABLE public.ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) <= 120),
  description TEXT NOT NULL CHECK (char_length(description) <= 2000),
  price NUMERIC NOT NULL CHECK (price >= 0),
  currency TEXT NOT NULL DEFAULT 'NGN',
  category TEXT NOT NULL,
  images TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(images) <= 5),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','sold','deleted')),
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ads_seller_idx ON public.ads (seller_id);
CREATE INDEX ads_status_created_idx ON public.ads (status, created_at DESC);
GRANT SELECT ON public.ads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads TO authenticated;
GRANT ALL ON public.ads TO service_role;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ads_public_read_active" ON public.ads FOR SELECT USING (status = 'active' OR auth.uid() = seller_id);
CREATE POLICY "ads_owner_insert" ON public.ads FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "ads_owner_update" ON public.ads FOR UPDATE TO authenticated USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "ads_owner_delete" ON public.ads FOR DELETE TO authenticated USING (auth.uid() = seller_id);
CREATE TRIGGER ads_updated_at BEFORE UPDATE ON public.ads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== orders ==========
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','completed','cancelled','disputed')),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  total_price NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX orders_buyer_idx ON public.orders (buyer_id, created_at DESC);
CREATE INDEX orders_seller_idx ON public.orders (seller_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_party_read" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "orders_buyer_insert" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id AND buyer_id <> seller_id);
CREATE POLICY "orders_party_update" ON public.orders FOR UPDATE TO authenticated USING (auth.uid() = buyer_id OR auth.uid() = seller_id) WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== conversations & messages ==========
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_one UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  participant_two UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (participant_one, participant_two),
  CHECK (participant_one < participant_two)
);
CREATE INDEX conversations_p1_idx ON public.conversations (participant_one, last_message_at DESC);
CREATE INDEX conversations_p2_idx ON public.conversations (participant_two, last_message_at DESC);
GRANT SELECT ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversations_participant_read" ON public.conversations FOR SELECT TO authenticated USING (auth.uid() = participant_one OR auth.uid() = participant_two);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX messages_conversation_idx ON public.messages (conversation_id, created_at);
CREATE INDEX messages_receiver_unread_idx ON public.messages (receiver_id) WHERE read = false;
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_party_read" ON public.messages FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "messages_sender_insert" ON public.messages FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = sender_id AND EXISTS (
    SELECT 1 FROM public.conversations c WHERE c.id = conversation_id
      AND ((c.participant_one = sender_id AND c.participant_two = receiver_id) OR (c.participant_two = sender_id AND c.participant_one = receiver_id))
  )
);
CREATE POLICY "messages_receiver_mark_read" ON public.messages FOR UPDATE TO authenticated USING (auth.uid() = receiver_id) WITH CHECK (auth.uid() = receiver_id);
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

CREATE OR REPLACE FUNCTION public.bump_conversation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id; RETURN NEW; END; $$;
CREATE TRIGGER messages_bump_conversation AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.bump_conversation();

CREATE OR REPLACE FUNCTION public.get_or_create_conversation(p_other UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me UUID := auth.uid(); v_a UUID; v_b UUID; v_id UUID;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF v_me = p_other THEN RAISE EXCEPTION 'Cannot message yourself'; END IF;
  IF v_me < p_other THEN v_a := v_me; v_b := p_other; ELSE v_a := p_other; v_b := v_me; END IF;
  SELECT id INTO v_id FROM public.conversations WHERE participant_one = v_a AND participant_two = v_b;
  IF v_id IS NULL THEN
    INSERT INTO public.conversations (participant_one, participant_two) VALUES (v_a, v_b) RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(UUID) TO authenticated;

-- ========== friends ==========
CREATE TABLE public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sender_id, receiver_id),
  CHECK (sender_id <> receiver_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friend_requests TO authenticated;
GRANT ALL ON public.friend_requests TO service_role;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fr_party_read" ON public.friend_requests FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "fr_sender_insert" ON public.friend_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "fr_sender_delete" ON public.friend_requests FOR DELETE TO authenticated USING (auth.uid() = sender_id);
CREATE POLICY "fr_receiver_update" ON public.friend_requests FOR UPDATE TO authenticated USING (auth.uid() = receiver_id) WITH CHECK (auth.uid() = receiver_id);

CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_one UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_two UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_one, user_two),
  CHECK (user_one < user_two)
);
GRANT SELECT, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "friendships_party_read" ON public.friendships FOR SELECT TO authenticated USING (auth.uid() = user_one OR auth.uid() = user_two);
CREATE POLICY "friendships_party_delete" ON public.friendships FOR DELETE TO authenticated USING (auth.uid() = user_one OR auth.uid() = user_two);

CREATE OR REPLACE FUNCTION public.accept_friend_request(p_request UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; v_a UUID; v_b UUID;
BEGIN
  SELECT * INTO r FROM public.friend_requests WHERE id = p_request AND receiver_id = auth.uid() AND status = 'pending';
  IF r IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF r.sender_id < r.receiver_id THEN v_a := r.sender_id; v_b := r.receiver_id; ELSE v_a := r.receiver_id; v_b := r.sender_id; END IF;
  INSERT INTO public.friendships (user_one, user_two) VALUES (v_a, v_b) ON CONFLICT DO NOTHING;
  UPDATE public.friend_requests SET status = 'accepted' WHERE id = p_request;
  DELETE FROM public.friend_requests WHERE sender_id = r.receiver_id AND receiver_id = r.sender_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.accept_friend_request(UUID) TO authenticated;

-- ========== daily check-ins ==========
CREATE TABLE public.daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  check_in_date DATE NOT NULL,
  streak_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, check_in_date)
);
GRANT SELECT ON public.daily_checkins TO authenticated;
GRANT ALL ON public.daily_checkins TO service_role;
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checkins_owner_read" ON public.daily_checkins FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.daily_check_in()
RETURNS TABLE (current_streak INTEGER, longest_streak INTEGER, already_checked_in BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p RECORD; v_today DATE := CURRENT_DATE; v_streak INTEGER;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF p IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p.last_check_in = v_today THEN
    RETURN QUERY SELECT p.current_streak, p.longest_streak, true; RETURN;
  END IF;
  IF p.last_check_in = v_today - 1 THEN v_streak := p.current_streak + 1; ELSE v_streak := 1; END IF;
  INSERT INTO public.daily_checkins (user_id, check_in_date, streak_count) VALUES (p.id, v_today, v_streak);
  UPDATE public.profiles SET current_streak = v_streak, longest_streak = GREATEST(p.longest_streak, v_streak), last_check_in = v_today WHERE id = p.id;
  RETURN QUERY SELECT v_streak, GREATEST(p.longest_streak, v_streak), false;
END; $$;
GRANT EXECUTE ON FUNCTION public.daily_check_in() TO authenticated;

-- ========== data / airtime ==========
CREATE TABLE public.data_airtime_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('data','airtime')),
  provider TEXT NOT NULL CHECK (provider IN ('MTN','Airtel','Glo','9mobile')),
  phone_number TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  data_plan TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  reference TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX dao_user_idx ON public.data_airtime_orders (user_id, created_at DESC);
GRANT SELECT, INSERT ON public.data_airtime_orders TO authenticated;
GRANT ALL ON public.data_airtime_orders TO service_role;
ALTER TABLE public.data_airtime_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dao_owner_read" ON public.data_airtime_orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "dao_owner_insert" ON public.data_airtime_orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ========== public stats ==========
CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS TABLE (total_users BIGINT, total_ads BIGINT, completed_orders BIGINT, total_messages BIGINT, total_checkins BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (SELECT count(*) FROM public.profiles),
         (SELECT count(*) FROM public.ads WHERE status <> 'deleted'),
         (SELECT count(*) FROM public.orders WHERE status = 'completed'),
         (SELECT count(*) FROM public.messages),
         (SELECT count(*) FROM public.daily_checkins);
$$;
GRANT EXECUTE ON FUNCTION public.get_public_stats() TO anon, authenticated;

-- public profile stats
CREATE OR REPLACE FUNCTION public.get_profile_stats(p_user UUID)
RETURNS TABLE (ads_count BIGINT, completed_orders BIGINT, referrals INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (SELECT count(*) FROM public.ads WHERE seller_id = p_user AND status <> 'deleted'),
         (SELECT count(*) FROM public.orders WHERE (seller_id = p_user OR buyer_id = p_user) AND status = 'completed'),
         (SELECT total_referrals FROM public.profiles WHERE id = p_user);
$$;
GRANT EXECUTE ON FUNCTION public.get_profile_stats(UUID) TO anon, authenticated;

-- ========== account deletion ==========
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  DELETE FROM auth.users WHERE id = auth.uid();
END; $$;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

-- ========== storage ==========
CREATE POLICY "ad_images_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'ad-images');
CREATE POLICY "ad_images_owner_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ad-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "ad_images_owner_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'ad-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "ad_images_owner_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'ad-images' AND (storage.foldername(name))[1] = auth.uid()::text);