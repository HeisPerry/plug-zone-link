CREATE TABLE IF NOT EXISTS public.admin_emails (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_emails TO service_role;
ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view admin emails" ON public.admin_emails FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.admin_emails (email) VALUES ('heisalimi1@gmail.com') ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role FROM auth.users u
WHERE lower(u.email) IN (SELECT lower(email) FROM public.admin_emails)
ON CONFLICT (user_id, role) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  IF NEW.email IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_emails a WHERE lower(a.email) = lower(NEW.email)) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;