CREATE OR REPLACE FUNCTION public.accept_invitation(p_code text)
RETURNS jsonb AS $$
DECLARE
  invite public.invitations%rowtype;
  caller uuid := auth.uid();
  caller_email text;
BEGIN
  IF caller IS NULL THEN
    RETURN jsonb_build_object('error', 'authentication_required');
  END IF;

  SELECT email INTO caller_email FROM auth.users WHERE id = caller;

  SELECT * INTO invite
  FROM public.invitations
  WHERE invitation_code = p_code
    AND expires_at > timezone('utc'::text, now())
    AND accepted_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_or_expired');
  END IF;

  IF lower(caller_email) <> lower(invite.email) THEN
    RETURN jsonb_build_object('error', 'email_mismatch');
  END IF;

  INSERT INTO public.members (id, atelier_id, role, full_name, email, active)
  SELECT caller, invite.atelier_id, invite.role, COALESCE(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1)), u.email, true
  FROM auth.users u
  WHERE u.id = caller
  ON CONFLICT (id) DO UPDATE
  SET atelier_id = EXCLUDED.atelier_id,
      role = EXCLUDED.role,
      full_name = COALESCE(EXCLUDED.full_name, public.members.full_name),
      email = COALESCE(EXCLUDED.email, public.members.email),
      updated_at = timezone('utc'::text, now());

  UPDATE public.invitations
  SET accepted_at = timezone('utc'::text, now())
  WHERE id = invite.id;

  RETURN jsonb_build_object('success', true, 'atelier_id', invite.atelier_id, 'role', invite.role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.accept_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated;
