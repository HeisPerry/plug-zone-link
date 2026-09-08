-- Super admin flag
ALTER TABLE public.admin_emails ADD COLUMN IF NOT EXISTS is_super boolean NOT NULL DEFAULT false;
INSERT INTO public.admin_emails (email) VALUES ('heisalimi1@gmail.com') ON CONFLICT (email) DO NOTHING;
UPDATE public.admin_emails SET is_super = true WHERE email = 'heisalimi1@gmail.com';

CREATE OR REPLACE FUNCTION public.is_super_admin(_user uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    JOIN public.admin_emails a ON lower(u.email) = lower(a.email)
    WHERE u.id = _user AND a.is_super
  )
$$;

-- Admin invitations
CREATE TABLE IF NOT EXISTS public.admin_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS admin_invites_one_pending ON public.admin_invites (invitee_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS admin_invites_invitee_idx ON public.admin_invites (invitee_id, created_at DESC);

GRANT SELECT ON public.admin_invites TO authenticated;
GRANT ALL ON public.admin_invites TO service_role;
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Invitees and admins can view invites" ON public.admin_invites;
CREATE POLICY "Invitees and admins can view invites" ON public.admin_invites
FOR SELECT TO authenticated
USING (invitee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Send an admin invite (super admin only)
CREATE OR REPLACE FUNCTION public.invite_admin(p_user uuid, p_note text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only the owner account can invite admins';
  END IF;
  IF p_user = auth.uid() THEN
    RAISE EXCEPTION 'You are already an admin';
  END IF;
  IF public.has_role(p_user, 'admin') THEN
    RAISE EXCEPTION 'That person is already an admin';
  END IF;
  IF EXISTS (SELECT 1 FROM public.admin_invites WHERE invitee_id = p_user AND status = 'pending') THEN
    RAISE EXCEPTION 'They already have a pending invite';
  END IF;

  INSERT INTO public.admin_invites (invitee_id, invited_by, note)
  VALUES (p_user, auth.uid(), nullif(p_note, ''))
  RETURNING id INTO v_id;

  PERFORM public.notify(
    p_user,
    'admin_invite',
    'You have been invited to be an admin',
    coalesce(nullif(p_note, ''), 'Accept to get access to the PlugZone admin tools.'),
    '/notifications',
    auth.uid(),
    'admin_invite',
    v_id
  );
  RETURN v_id;
END;
$$;

-- Accept or decline an invite
CREATE OR REPLACE FUNCTION public.respond_admin_invite(p_invite uuid, p_action text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v public.admin_invites%ROWTYPE;
BEGIN
  SELECT * INTO v FROM public.admin_invites WHERE id = p_invite FOR UPDATE;
  IF v.id IS NULL OR v.invitee_id <> auth.uid() THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;
  IF v.status <> 'pending' THEN
    RAISE EXCEPTION 'This invite was already answered';
  END IF;
  IF p_action NOT IN ('accept', 'decline') THEN
    RAISE EXCEPTION 'Unknown action';
  END IF;

  UPDATE public.admin_invites SET status = CASE WHEN p_action = 'accept' THEN 'accepted' ELSE 'declined' END, responded_at = now() WHERE id = p_invite;

  IF p_action = 'accept' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v.invitee_id, 'admin') ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  IF v.invited_by IS NOT NULL THEN
    PERFORM public.notify(
      v.invited_by,
      'admin_invite',
      CASE WHEN p_action = 'accept' THEN 'Admin invite accepted' ELSE 'Admin invite declined' END,
      public.display_name_of(v.invitee_id) || CASE WHEN p_action = 'accept' THEN ' is now an admin.' ELSE ' turned down the admin invite.' END,
      '/admin',
      v.invitee_id,
      'admin_invite',
      v.id
    );
  END IF;
END;
$$;

-- Revoke a pending invite (super admin only)
CREATE OR REPLACE FUNCTION public.revoke_admin_invite(p_invite uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only the owner account can manage admins';
  END IF;
  UPDATE public.admin_invites SET status = 'revoked', responded_at = now() WHERE id = p_invite AND status = 'pending';
END;
$$;

-- Remove an admin (super admin only)
CREATE OR REPLACE FUNCTION public.remove_admin(p_user uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only the owner account can manage admins';
  END IF;
  IF public.is_super_admin(p_user) THEN
    RAISE EXCEPTION 'The owner account cannot be removed';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = p_user AND role = 'admin';
  PERFORM public.notify(p_user, 'admin_invite', 'Admin access removed', 'You no longer have access to the PlugZone admin tools.', '/dashboard', auth.uid(), 'admin_invite', NULL);
END;
$$;

-- List current admins and invites
CREATE OR REPLACE FUNCTION public.list_admins()
RETURNS TABLE(user_id uuid, username text, display_name text, avatar_url text, is_super boolean, since timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  RETURN QUERY
  SELECT p.id, p.username, p.display_name, p.avatar_url, public.is_super_admin(p.id), r.created_at
  FROM public.user_roles r
  JOIN public.profiles p ON p.id = r.user_id
  WHERE r.role = 'admin'
  ORDER BY r.created_at;
END;
$$;

-- Weekly totals
CREATE OR REPLACE FUNCTION public.admin_weekly_stats()
RETURNS TABLE(gmv numeric, active_buyers bigint, active_sellers bigint, orders_count bigint, escrow_volume numeric, disputes_count bigint, dispute_rate numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_from timestamptz := now() - interval '7 days';
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  RETURN QUERY
  WITH o AS (SELECT * FROM public.orders WHERE created_at >= v_from),
       d AS (SELECT * FROM public.disputes WHERE created_at >= v_from)
  SELECT
    (SELECT coalesce(sum(total_price), 0) FROM o WHERE status NOT IN ('cancelled')),
    (SELECT count(DISTINCT buyer_id) FROM o),
    (SELECT count(DISTINCT seller_id) FROM o),
    (SELECT count(*) FROM o),
    (SELECT coalesce(sum(amount), 0) FROM public.escrow_ledger WHERE created_at >= v_from AND entry_type = 'hold'),
    (SELECT count(*) FROM d),
    CASE WHEN (SELECT count(*) FROM o) = 0 THEN 0
         ELSE round((SELECT count(*) FROM d)::numeric * 100 / (SELECT count(*) FROM o), 1) END;
END;
$$;

REVOKE ALL ON FUNCTION public.is_super_admin(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.invite_admin(uuid, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.respond_admin_invite(uuid, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.revoke_admin_invite(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.remove_admin(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.list_admins() FROM public, anon;
REVOKE ALL ON FUNCTION public.admin_weekly_stats() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_admin(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_admin_invite(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_admin_invite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_admins() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_weekly_stats() TO authenticated;