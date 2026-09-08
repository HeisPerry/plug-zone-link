
INSERT INTO public.platform_settings (key, value, description) VALUES
  ('trust_weight_sales', '30', 'Points from completed sales volume'),
  ('trust_weight_rating', '40', 'Points from average review rating'),
  ('trust_weight_completion', '20', 'Points from order completion rate'),
  ('trust_weight_disputes', '10', 'Points kept when no problems were reported'),
  ('trust_sales_target', '25', 'Completed sales needed for full sales points'),
  ('trust_tier_rising', '35', 'Score needed for the Rising badge'),
  ('trust_tier_trusted', '60', 'Score needed for the Trusted badge'),
  ('trust_tier_top', '85', 'Score needed for the Top Seller badge')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_seller_trust(p_user uuid)
RETURNS TABLE(
  score integer,
  tier text,
  sales_points numeric,
  rating_points numeric,
  completion_points numeric,
  dispute_points numeric,
  max_sales numeric,
  max_rating numeric,
  max_completion numeric,
  max_disputes numeric,
  completed_orders bigint,
  total_orders bigint,
  avg_rating numeric,
  review_count bigint,
  disputes bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w_sales numeric := setting_num('trust_weight_sales', 30);
  w_rating numeric := setting_num('trust_weight_rating', 40);
  w_completion numeric := setting_num('trust_weight_completion', 20);
  w_disputes numeric := setting_num('trust_weight_disputes', 10);
  target numeric := greatest(setting_num('trust_sales_target', 25), 1);
  t_rising numeric := setting_num('trust_tier_rising', 35);
  t_trusted numeric := setting_num('trust_tier_trusted', 60);
  t_top numeric := setting_num('trust_tier_top', 85);
  v_completed bigint;
  v_total bigint;
  v_avg numeric;
  v_reviews bigint;
  v_disputes bigint;
  p_sales numeric;
  p_rating numeric;
  p_completion numeric;
  p_disp numeric;
  v_score integer;
BEGIN
  SELECT count(*) FILTER (WHERE o.status = 'completed'), count(*)
    INTO v_completed, v_total
    FROM public.orders o
   WHERE o.seller_id = p_user AND o.status <> 'pending';

  SELECT coalesce(avg(r.rating), 0), count(*) INTO v_avg, v_reviews
    FROM public.reviews r WHERE r.seller_id = p_user;

  SELECT count(*) INTO v_disputes
    FROM public.disputes d WHERE d.seller_id = p_user;

  p_sales := w_sales * least(v_completed::numeric / target, 1);
  p_rating := CASE WHEN v_reviews = 0 THEN w_rating * 0.5
                   ELSE w_rating * greatest(least((v_avg - 1) / 4, 1), 0) END;
  p_completion := CASE WHEN v_total = 0 THEN w_completion * 0.5
                       ELSE w_completion * (v_completed::numeric / v_total) END;
  p_disp := CASE WHEN v_completed = 0 THEN w_disputes * 0.5
                 ELSE w_disputes * greatest(1 - (v_disputes::numeric / greatest(v_completed, 1)), 0) END;

  v_score := round(least(p_sales + p_rating + p_completion + p_disp, 100));

  RETURN QUERY SELECT
    v_score,
    CASE WHEN v_score >= t_top THEN 'Top Seller'
         WHEN v_score >= t_trusted THEN 'Trusted'
         WHEN v_score >= t_rising THEN 'Rising'
         ELSE 'New' END,
    round(p_sales, 1), round(p_rating, 1), round(p_completion, 1), round(p_disp, 1),
    w_sales, w_rating, w_completion, w_disputes,
    v_completed, v_total, round(v_avg, 2), v_reviews, v_disputes;
END;
$$;

REVOKE ALL ON FUNCTION public.get_seller_trust(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_seller_trust(uuid) TO anon, authenticated;
