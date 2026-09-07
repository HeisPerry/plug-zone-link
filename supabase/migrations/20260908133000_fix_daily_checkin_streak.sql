-- Allow the security-definer daily check-in RPC to update protected profile counters
-- while still blocking direct authenticated edits from the client.

CREATE OR REPLACE FUNCTION public.profiles_protect_counters()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_setting('app.allow_profile_counter_update', true) = 'true' THEN
    RETURN NEW;
  END IF;

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

DROP TRIGGER IF EXISTS profiles_protect_counters ON public.profiles;
CREATE TRIGGER profiles_protect_counters BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.profiles_protect_counters();

CREATE OR REPLACE FUNCTION public.daily_check_in()
RETURNS TABLE (current_streak INTEGER, longest_streak INTEGER, already_checked_in BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p RECORD; v_today DATE := CURRENT_DATE; v_streak INTEGER;
BEGIN
  PERFORM set_config('app.allow_profile_counter_update', 'true', true);

  SELECT * INTO p FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF p IS NULL THEN
    PERFORM set_config('app.allow_profile_counter_update', 'false', true);
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p.last_check_in = v_today THEN
    PERFORM set_config('app.allow_profile_counter_update', 'false', true);
    RETURN QUERY SELECT p.current_streak, p.longest_streak, true;
    RETURN;
  END IF;

  IF p.last_check_in = v_today - 1 THEN
    v_streak := p.current_streak + 1;
  ELSE
    v_streak := 1;
  END IF;

  INSERT INTO public.daily_checkins (user_id, check_in_date, streak_count)
  VALUES (p.id, v_today, v_streak);

  UPDATE public.profiles
  SET current_streak = v_streak,
      longest_streak = GREATEST(p.longest_streak, v_streak),
      last_check_in = v_today
  WHERE id = p.id;

  PERFORM set_config('app.allow_profile_counter_update', 'false', true);
  RETURN QUERY SELECT v_streak, GREATEST(p.longest_streak, v_streak), false;
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.allow_profile_counter_update', 'false', true);
    RAISE;
END; $$;

GRANT EXECUTE ON FUNCTION public.daily_check_in() TO authenticated;
