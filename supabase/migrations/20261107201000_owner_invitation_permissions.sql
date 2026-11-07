-- 20261107201000_owner_invitation_permissions.sql
-- Enforce that only owners can create owner invitations and prevent removing last owner

CREATE OR REPLACE FUNCTION public.check_owner_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  performer uuid := auth.uid();
  performer_role text;
BEGIN
  SELECT role INTO performer_role FROM public.members WHERE id = performer AND active = true;
  IF NEW.role = 'owner' AND performer_role IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'only_owner_can_invite_owner';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_owner_creation ON public.invitations;
CREATE TRIGGER trg_check_owner_creation
BEFORE INSERT ON public.invitations
FOR EACH ROW EXECUTE FUNCTION public.check_owner_creation();

CREATE OR REPLACE FUNCTION public.prevent_last_owner_demotion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  owner_count integer;
BEGIN
  SELECT COUNT(*) INTO owner_count FROM public.members WHERE atelier_id = NEW.atelier_id AND role = 'owner' AND active = true;
  IF owner_count <= 1 THEN
    RAISE EXCEPTION 'cannot_remove_last_owner';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_last_owner_demotion ON public.members;
CREATE TRIGGER trg_prevent_last_owner_demotion
BEFORE UPDATE OF role ON public.members
FOR EACH ROW
WHEN (OLD.role = 'owner' AND NEW.role <> 'owner')
EXECUTE FUNCTION public.prevent_last_owner_demotion();
