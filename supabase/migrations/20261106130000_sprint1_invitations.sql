-- Sprint 1: invitation ledger for employee/client onboarding
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    atelier_id UUID NOT NULL REFERENCES public.ateliers(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('employee', 'client')),
    invitation_code TEXT NOT NULL UNIQUE,
    invited_by UUID,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '14 days'),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_invitations_atelier_email ON public.invitations (atelier_id, lower(email));
CREATE INDEX IF NOT EXISTS idx_invitations_code ON public.invitations (invitation_code);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invitations_owner_manage"
ON public.invitations FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = auth.uid()
      AND m.atelier_id = invitations.atelier_id
      AND m.active
      AND m.role = 'owner'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = auth.uid()
      AND m.atelier_id = invitations.atelier_id
      AND m.active
      AND m.role = 'owner'
  )
);

CREATE OR REPLACE FUNCTION public.lookup_invitation(p_code text)
RETURNS jsonb AS $$
DECLARE
  row public.invitations%rowtype;
BEGIN
  SELECT * INTO row
  FROM public.invitations
  WHERE invitation_code = p_code
    AND (expires_at > timezone('utc'::text, now()))
    AND accepted_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_or_expired');
  END IF;

  RETURN jsonb_build_object(
    'id', row.id,
    'atelier_id', row.atelier_id,
    'email', row.email,
    'role', row.role,
    'expires_at', row.expires_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.lookup_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_invitation(text) TO anon, authenticated;
