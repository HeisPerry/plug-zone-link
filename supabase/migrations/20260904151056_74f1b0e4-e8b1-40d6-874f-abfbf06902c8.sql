REVOKE EXECUTE ON FUNCTION public.notify(uuid, text, text, text, text, uuid, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.display_name_of(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_negotiation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_friend_request() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_order() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_transaction() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_friend_new_ad() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.messages_sync_read_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.transactions_compute_fee() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_messages_delivered() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_all_notifications_read() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.touch_last_seen() FROM PUBLIC, anon;
CREATE OR REPLACE FUNCTION public.platform_fee_rate()
RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path = public AS $$ SELECT 0.05::numeric $$;