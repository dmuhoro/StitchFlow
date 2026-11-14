-- 20261107200000_add_audit_log.sql
-- Adds audit_log table and triggers for members role changes and invites

-- audit_log already exists from Sprint 1 migration; reuse its schema.
CREATE OR REPLACE FUNCTION public.insert_audit_log(
  p_atelier_id uuid,
  p_table_name text,
  p_action text,
  p_performer uuid,
  p_record_id uuid,
  p_after_data jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.audit_log
    (atelier_id, actor_user_id, table_name, record_id, action, after_data)
  VALUES
    (p_atelier_id, p_performer, p_table_name, p_record_id, lower(p_action), p_after_data);
END;
$$;

CREATE OR REPLACE FUNCTION public.log_member_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  performer uuid := auth.uid();
  affected uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    affected := NEW.id;
  ELSIF TG_OP = 'UPDATE' THEN
    affected := NEW.id;
  ELSIF TG_OP = 'DELETE' THEN
    affected := OLD.id;
  END IF;

  PERFORM public.insert_audit_log(
    COALESCE(NEW.atelier_id, OLD.atelier_id),
    'members',
    TG_OP,
    performer,
    affected,
    to_jsonb(COALESCE(NEW, OLD))
  );
  RETURN NULL;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_member_change' AND tgrelid = 'public.members'::regclass) THEN
    DROP TRIGGER IF EXISTS trg_member_change ON public.members;
    CREATE TRIGGER trg_member_change
    AFTER INSERT OR UPDATE OR DELETE ON public.members
    FOR EACH ROW EXECUTE FUNCTION public.log_member_change();
  END IF;
END
$$;
