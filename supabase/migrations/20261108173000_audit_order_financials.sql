BEGIN;

DROP POLICY IF EXISTS "audit_log_member_read" ON public.audit_log;
CREATE POLICY "audit_log_member_read"
ON public.audit_log FOR SELECT
TO authenticated
USING (
  atelier_id = public.current_member_atelier_id()
  AND (
    table_name <> 'order_financials'
    OR public.current_member_role() = 'owner'
  )
);

CREATE OR REPLACE FUNCTION public.write_financials_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_atelier_id uuid;
  v_order_id uuid;
  v_before_data jsonb;
  v_after_data jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_atelier_id := OLD.atelier_id;
    v_order_id := OLD.order_id;
    IF NOT EXISTS (SELECT 1 FROM public.ateliers a WHERE a.id = v_atelier_id) THEN
      RETURN OLD;
    END IF;
    v_before_data := jsonb_build_object(
      'order_id', OLD.order_id,
      'deposit_amount', OLD.deposit_amount,
      'balance_due', OLD.balance_due,
      'currency', OLD.currency
    );
  ELSE
    v_atelier_id := NEW.atelier_id;
    v_order_id := NEW.order_id;
    IF TG_OP = 'UPDATE' THEN
      v_before_data := jsonb_build_object(
        'order_id', OLD.order_id,
        'deposit_amount', OLD.deposit_amount,
        'balance_due', OLD.balance_due,
        'currency', OLD.currency
      );
    END IF;
    v_after_data := jsonb_build_object(
      'order_id', NEW.order_id,
      'deposit_amount', NEW.deposit_amount,
      'balance_due', NEW.balance_due,
      'currency', NEW.currency
    );
  END IF;

  INSERT INTO public.audit_log (
    atelier_id, actor_user_id, table_name, record_id, action, before_data, after_data
  )
  VALUES (
    v_atelier_id,
    auth.uid(),
    TG_TABLE_NAME,
    v_order_id,
    lower(TG_OP),
    v_before_data,
    v_after_data
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.write_financials_audit_log() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS audit_order_financials_trigger ON public.order_financials;
CREATE TRIGGER audit_order_financials_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.order_financials
  FOR EACH ROW EXECUTE FUNCTION public.write_financials_audit_log();

COMMIT;
