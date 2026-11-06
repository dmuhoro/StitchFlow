-- Sprint 1 hardening: atomic onboarding, audited settings/roles, invitation
-- lookup lockdown, and tenant-correct write helpers.
--
-- Forward-only. No existing migration is edited.

-- ----------------------------------------------------------------------------
-- 1. Hardening: every SECURITY DEFINER function gets an empty search_path and
--    fully qualified relations/functions. This closes search-path hijacking.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lookup_invitation(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  row public.invitations%rowtype;
BEGIN
  SELECT * INTO row
  FROM public.invitations
  WHERE invitation_code = p_code
    AND expires_at > timezone('utc'::text, now())
    AND accepted_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_or_expired');
  END IF;

  -- Never disclose the invited email to an unauthenticated caller. The
  -- authenticated acceptance screen receives only the non-identifying fields.
  RETURN jsonb_build_object(
    'id', row.id,
    'atelier_id', row.atelier_id,
    'role', row.role,
    'expires_at', row.expires_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_invitation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_invitation(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_invitation(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  invite public.invitations%rowtype;
  caller uuid := auth.uid();
  caller_email text;
  caller_name text;
BEGIN
  IF caller IS NULL THEN
    RETURN jsonb_build_object('error', 'authentication_required');
  END IF;

  SELECT u.email, COALESCE(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1))
    INTO caller_email, caller_name
  FROM auth.users u
  WHERE u.id = caller;

  IF caller_email IS NULL THEN
    RETURN jsonb_build_object('error', 'authentication_required');
  END IF;

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

  -- An invitee may already be an active member of another atelier. Refuse to
  -- silently move them; multi-atelier membership is an explicit future change.
  IF EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = caller AND m.active AND m.atelier_id <> invite.atelier_id
  ) THEN
    RETURN jsonb_build_object('error', 'already_member_of_another_atelier');
  END IF;

  INSERT INTO public.members (id, atelier_id, role, full_name, email, active)
  VALUES (caller, invite.atelier_id, invite.role, caller_name, caller_email, true)
  ON CONFLICT (id) DO UPDATE
  SET atelier_id = EXCLUDED.atelier_id,
      role = EXCLUDED.role,
      full_name = COALESCE(EXCLUDED.full_name, public.members.full_name),
      email = COALESCE(EXCLUDED.email, public.members.email),
      active = true,
      updated_at = timezone('utc'::text, now());

  UPDATE public.invitations
  SET accepted_at = timezone('utc'::text, now())
  WHERE id = invite.id;

  RETURN jsonb_build_object('success', true, 'atelier_id', invite.atelier_id, 'role', invite.role);
END;
$$;

REVOKE ALL ON FUNCTION public.accept_invitation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated;

-- ----------------------------------------------------------------------------
-- 2. Atomic owner onboarding.
--
-- The previous client path was two independent PostgREST inserts. A failure
-- between them left an orphan atelier that no member could reach. This function
-- creates the atelier and the founding owner membership in one transaction and
-- refuses a second onboarding for an existing active member.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_atelier_for_current_user(
  p_name text,
  p_slug text,
  p_tagline text DEFAULT NULL,
  p_whatsapp text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller uuid := auth.uid();
  caller_email text;
  caller_name text;
  new_atelier_id uuid;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'atelier_name_required';
  END IF;

  IF p_slug IS NULL OR p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'invalid_slug';
  END IF;

  SELECT u.email, COALESCE(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1))
    INTO caller_email, caller_name
  FROM auth.users u
  WHERE u.id = caller;

  IF caller_email IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  IF EXISTS (SELECT 1 FROM public.members m WHERE m.id = caller AND m.active) THEN
    RAISE EXCEPTION 'already_member';
  END IF;

  INSERT INTO public.ateliers (name, slug, tagline, whatsapp_number, created_by)
  VALUES (btrim(p_name), p_slug, NULLIF(btrim(p_tagline), ''), NULLIF(btrim(p_whatsapp), ''), caller)
  RETURNING id INTO new_atelier_id;

  INSERT INTO public.members (id, atelier_id, role, full_name, email, active)
  VALUES (caller, new_atelier_id, 'owner', caller_name, caller_email, true);

  RETURN new_atelier_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_atelier_for_current_user(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_atelier_for_current_user(text, text, text, text) TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. Audit trail: orders and measurements already had triggers. Settings
--    (ateliers) and role/membership changes (members) are added here.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.write_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  atelier uuid;
  record_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    atelier := OLD.atelier_id;
    record_id := OLD.id;
    -- A cascade from atelier deletion must not abort on the audit FK.
    IF NOT EXISTS (SELECT 1 FROM public.ateliers a WHERE a.id = atelier) THEN
      RETURN OLD;
    END IF;
  ELSE
    atelier := NEW.atelier_id;
    record_id := NEW.id;
  END IF;

  INSERT INTO public.audit_log (atelier_id, actor_user_id, table_name, record_id, action, before_data, after_data)
  VALUES (
    atelier,
    auth.uid(),
    TG_TABLE_NAME,
    record_id,
    lower(TG_OP),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.write_atelier_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.audit_log (atelier_id, actor_user_id, table_name, record_id, action, before_data, after_data)
  VALUES (
    COALESCE(NEW.id, OLD.id),
    auth.uid(),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    lower(TG_OP),
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS audit_ateliers_trigger ON public.ateliers;
CREATE TRIGGER audit_ateliers_trigger
  AFTER INSERT OR UPDATE ON public.ateliers
  FOR EACH ROW EXECUTE FUNCTION public.write_atelier_audit_log();

DROP TRIGGER IF EXISTS audit_members_trigger ON public.members;
CREATE TRIGGER audit_members_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
