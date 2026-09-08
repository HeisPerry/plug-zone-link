REVOKE ALL ON FUNCTION public.orders_log_event() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.orders_set_number() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_order_number() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.get_seller_earnings(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.request_withdrawal(numeric, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
