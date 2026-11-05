-- Sprint 1: append-only audit log for orders and measurements
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    atelier_id UUID NOT NULL REFERENCES public.ateliers(id) ON DELETE CASCADE,
    actor_user_id UUID,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
    before_data JSONB,
    after_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_log_atelier_created ON public.audit_log (atelier_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_record ON public.audit_log (table_name, record_id);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_member_read"
ON public.audit_log FOR SELECT
TO authenticated
USING (atelier_id = public.current_member_atelier_id());

CREATE OR REPLACE FUNCTION public.write_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  atelier UUID;
  record_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    atelier := OLD.atelier_id;
    record_id := OLD.id;
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_orders_trigger ON public.orders;
CREATE TRIGGER audit_orders_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

DROP TRIGGER IF EXISTS audit_measurements_trigger ON public.measurements;
CREATE TRIGGER audit_measurements_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.measurements
  FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
