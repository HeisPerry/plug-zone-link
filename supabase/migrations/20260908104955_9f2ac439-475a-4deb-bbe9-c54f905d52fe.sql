CREATE POLICY "admins read all ads" ON public.ads FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update ads" ON public.ads FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins read all orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.admin_overview()
RETURNS TABLE (
  total_users bigint,
  total_ads bigint,
  active_ads bigint,
  total_orders bigint,
  escrow_held numeric,
  gross_sales numeric,
  platform_fees numeric,
  open_disputes bigint,
  pending_withdrawals bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT count(*) FROM public.profiles),
    (SELECT count(*) FROM public.ads),
    (SELECT count(*) FROM public.ads WHERE status = 'active'),
    (SELECT count(*) FROM public.orders),
    (SELECT coalesce(sum(total_price), 0) FROM public.orders WHERE escrow_status = 'held'),
    (SELECT coalesce(sum(amount), 0) FROM public.transactions WHERE status = 'paid'),
    (SELECT coalesce(sum(platform_fee), 0) FROM public.transactions WHERE status = 'paid'),
    (SELECT count(*) FROM public.disputes WHERE status <> 'resolved'),
    (SELECT count(*) FROM public.withdrawals WHERE status = 'pending');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_overview() TO authenticated;