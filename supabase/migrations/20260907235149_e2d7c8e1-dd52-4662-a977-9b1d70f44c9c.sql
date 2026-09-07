CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  ad_id uuid REFERENCES public.ads(id) ON DELETE SET NULL,
  reviewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY reviews_public_read ON public.reviews FOR SELECT USING (true);

CREATE POLICY reviews_buyer_insert ON public.reviews FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = reviewer_id
  AND reviewer_id <> seller_id
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = reviews.order_id
      AND o.buyer_id = auth.uid()
      AND o.seller_id = reviews.seller_id
      AND o.status = 'completed'
  )
);

CREATE POLICY reviews_owner_update ON public.reviews FOR UPDATE TO authenticated
USING (auth.uid() = reviewer_id) WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY reviews_owner_delete ON public.reviews FOR DELETE TO authenticated
USING (auth.uid() = reviewer_id);

CREATE OR REPLACE FUNCTION public.reviews_validate()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER reviews_validate_trg BEFORE INSERT OR UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.reviews_validate();

CREATE INDEX reviews_seller_idx ON public.reviews(seller_id, created_at DESC);

DROP FUNCTION IF EXISTS public.get_profile_stats(uuid);

CREATE FUNCTION public.get_profile_stats(p_user uuid)
RETURNS TABLE(ads_count bigint, completed_orders bigint, referrals integer, avg_rating numeric, review_count bigint, purchases bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT count(*) FROM ads a WHERE a.seller_id = p_user AND a.status = 'active'),
    (SELECT count(*) FROM orders o WHERE o.seller_id = p_user AND o.status = 'completed'),
    (SELECT total_referrals FROM profiles p WHERE p.id = p_user),
    (SELECT round(avg(r.rating)::numeric, 1) FROM reviews r WHERE r.seller_id = p_user),
    (SELECT count(*) FROM reviews r WHERE r.seller_id = p_user),
    (SELECT count(*) FROM orders o WHERE o.buyer_id = p_user AND o.status = 'completed');
$$;