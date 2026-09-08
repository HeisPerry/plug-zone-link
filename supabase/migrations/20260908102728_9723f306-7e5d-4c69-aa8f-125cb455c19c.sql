DO $$
DECLARE f RECORD;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
  END LOOP;
END $$;

-- Public (signed-out) read-only lookups
GRANT EXECUTE ON FUNCTION public.get_public_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_stats(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_affiliate_click(text) TO anon, authenticated;

-- Signed-in app actions
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_friend_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.daily_check_in() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.make_offer(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_offer(uuid, text, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_messages_delivered() TO authenticated;
GRANT EXECUTE ON FUNCTION public.touch_last_seen() TO authenticated;
GRANT EXECUTE ON FUNCTION public.display_name_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_seller_earnings(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.become_seller(text,text,text,text,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_order(uuid,integer,text,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pay_order_test_mode(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_order_fulfilment(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_receipt(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_dispute(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_dispute(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_withdrawal_status(uuid,text,text) TO authenticated;
