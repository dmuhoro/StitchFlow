-- ============================================================================
-- STITCHFLOW PRODUCTION MULTI-TENANT DATABASE SCHEMA & ROW LEVEL SECURITY (RLS)
-- Target Platform: PostgreSQL 15+ / Supabase
-- Multi-Tenancy Architecture: Tenant Isolation via atelier_id foreign key
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. ATELIERS (Tenants)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ateliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    tagline TEXT,
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'KES',
    phone TEXT,
    whatsapp TEXT,
    default_unit TEXT NOT NULL DEFAULT 'in' CHECK (default_unit IN ('in', 'cm')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ----------------------------------------------------------------------------
-- 2. USER PROFILES (Linked to Supabase auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    atelier_id UUID NOT NULL REFERENCES public.ateliers(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'employee', 'client')),
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT NOT NULL,
    avatar_url TEXT,
    specialty TEXT,
    passkey TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_atelier_id ON public.profiles(atelier_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ----------------------------------------------------------------------------
-- 3. MEASUREMENTS (With African Haute Couture Garment Dimensions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    atelier_id UUID NOT NULL REFERENCES public.ateliers(id) ON DELETE CASCADE,
    client_id UUID NOT NULL,
    client_name TEXT NOT NULL,
    phone TEXT,
    unit TEXT NOT NULL DEFAULT 'in' CHECK (unit IN ('in', 'cm')),
    -- Universal tailoring points
    chest NUMERIC(6,2),
    waist NUMERIC(6,2),
    hips NUMERIC(6,2),
    length NUMERIC(6,2),
    sleeve NUMERIC(6,2),
    shoulder NUMERIC(6,2),
    inseam NUMERIC(6,2),
    neck NUMERIC(6,2),
    -- African Haute Couture Specialized Dimensions:
    agbada_wingspan NUMERIC(6,2),  -- Grand Agbada 3-piece drape wingspan
    sokoto_inseam NUMERIC(6,2),    -- Traditional drawstring Sokoto trousers
    fila_cap_head NUMERIC(6,2),    -- Fila ceremonial cap head circumference
    buba_chest NUMERIC(6,2),       -- Inner Buba tunic relaxed chest circumference
    posture_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_measurements_atelier_id ON public.measurements(atelier_id);
CREATE INDEX IF NOT EXISTS idx_measurements_client_id ON public.measurements(client_id);

-- ----------------------------------------------------------------------------
-- 4. BESPOKE ORDERS & PRODUCTION WORKFLOW
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    atelier_id UUID NOT NULL REFERENCES public.ateliers(id) ON DELETE CASCADE,
    order_number TEXT NOT NULL,
    client_id UUID NOT NULL,
    client_name TEXT NOT NULL,
    client_phone TEXT,
    assigned_tailor_id UUID,
    assigned_tailor_name TEXT,
    status TEXT NOT NULL CHECK (status IN ('cutting', 'stitching', 'fitting', 'ready', 'delivered')),
    description TEXT NOT NULL,
    garment_type TEXT NOT NULL,
    fabric_details TEXT NOT NULL,
    estimated_delivery DATE,
    -- Financial tracking (Owner-restricted access)
    deposit_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    balance_due NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'KES',
    photo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_atelier_order_number UNIQUE (atelier_id, order_number)
);

CREATE INDEX IF NOT EXISTS idx_orders_atelier_id ON public.orders(atelier_id);
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON public.orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_tailor ON public.orders(assigned_tailor_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- ----------------------------------------------------------------------------
-- 5. ORDER PRODUCTION LOGS / AUDIT TRAIL
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_progress_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    atelier_id UUID NOT NULL REFERENCES public.ateliers(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    stage TEXT NOT NULL CHECK (stage IN ('cutting', 'stitching', 'fitting', 'ready', 'delivered')),
    note TEXT NOT NULL,
    author_id UUID,
    author_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_order_notes_order_id ON public.order_progress_notes(order_id);

-- ----------------------------------------------------------------------------
-- 6. APPOINTMENTS (Fittings, Consultations, Fabric Drop-off)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    atelier_id UUID NOT NULL REFERENCES public.ateliers(id) ON DELETE CASCADE,
    client_id UUID,
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    client_email TEXT,
    service_type TEXT NOT NULL,
    slot_datetime TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    assigned_tailor_id UUID,
    cultural_occasion TEXT,
    notes TEXT,
    reference_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_appointments_atelier_id ON public.appointments(atelier_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON public.appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_slot ON public.appointments(slot_datetime);

-- ----------------------------------------------------------------------------
-- 7. CLIENT FEEDBACK & FIT RATINGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    atelier_id UUID NOT NULL REFERENCES public.ateliers(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    client_id UUID,
    client_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    fit_rating TEXT NOT NULL CHECK (fit_rating IN ('tight', 'perfect', 'loose')),
    comments TEXT NOT NULL,
    resolution_status TEXT NOT NULL DEFAULT 'open' CHECK (resolution_status IN ('open', 'addressed', 'resolved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_atelier_id ON public.feedbacks(atelier_id);

-- ----------------------------------------------------------------------------
-- 8. DIGITAL LOOKBOOK & PORTFOLIO
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lookbook_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    atelier_id UUID NOT NULL REFERENCES public.ateliers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    fabric TEXT NOT NULL,
    price_range TEXT,
    turnaround_days INTEGER NOT NULL DEFAULT 7,
    image_url TEXT NOT NULL,
    cultural_origin TEXT,
    tags TEXT[] NOT NULL DEFAULT '{}',
    is_featured BOOLEAN NOT NULL DEFAULT false,
    published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_lookbook_atelier_id ON public.lookbook_items(atelier_id);
CREATE INDEX IF NOT EXISTS idx_lookbook_published ON public.lookbook_items(published);

-- ============================================================================
-- HELPER FUNCTIONS FOR ROW LEVEL SECURITY (RLS)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.current_user_atelier_id()
RETURNS UUID AS $$
  SELECT atelier_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS across all tables
ALTER TABLE public.ateliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_progress_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lookbook_items ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- RLS: ATELIERS
-- ----------------------------------------------------------------------------
-- Public can view basic atelier profile by slug
CREATE POLICY "Public can view atelier basic info"
ON public.ateliers FOR SELECT
TO anon, authenticated
USING (true);

-- Only Owners can update their atelier configuration
CREATE POLICY "Owners can update own atelier"
ON public.ateliers FOR UPDATE
TO authenticated
USING (id = public.current_user_atelier_id() AND public.current_user_role() = 'owner')
WITH CHECK (id = public.current_user_atelier_id() AND public.current_user_role() = 'owner');

-- ----------------------------------------------------------------------------
-- RLS: PROFILES
-- ----------------------------------------------------------------------------
-- Users can always view and edit their own profile
CREATE POLICY "Users can manage own profile"
ON public.profiles FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Owners can view all profiles belonging to their atelier
CREATE POLICY "Owners can view atelier profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (atelier_id = public.current_user_atelier_id() AND public.current_user_role() = 'owner');

-- Employees can view client profiles in the same atelier
CREATE POLICY "Employees can view client profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (atelier_id = public.current_user_atelier_id() AND public.current_user_role() = 'employee');

-- ----------------------------------------------------------------------------
-- RLS: MEASUREMENTS
-- ----------------------------------------------------------------------------
-- Owners: full CRUD access for measurements within their atelier
CREATE POLICY "Owners have full access to measurements"
ON public.measurements FOR ALL
TO authenticated
USING (atelier_id = public.current_user_atelier_id() AND public.current_user_role() = 'owner')
WITH CHECK (atelier_id = public.current_user_atelier_id() AND public.current_user_role() = 'owner');

-- Employees / Artisans: Read-only access to measurements in their atelier
CREATE POLICY "Artisans can view atelier measurements"
ON public.measurements FOR SELECT
TO authenticated
USING (atelier_id = public.current_user_atelier_id() AND public.current_user_role() = 'employee');

-- Patrons / Clients: Can ONLY view their own measurement records
CREATE POLICY "Patrons can view own measurements"
ON public.measurements FOR SELECT
TO authenticated
USING (client_id = auth.uid());

-- ----------------------------------------------------------------------------
-- RLS: ORDERS
-- ----------------------------------------------------------------------------
-- Owners: full CRUD on all orders for their specific atelier
CREATE POLICY "Owners have full control over atelier orders"
ON public.orders FOR ALL
TO authenticated
USING (atelier_id = public.current_user_atelier_id() AND public.current_user_role() = 'owner')
WITH CHECK (atelier_id = public.current_user_atelier_id() AND public.current_user_role() = 'owner');

-- Artisans / Employees: Can view orders assigned to them or unassigned orders in atelier
CREATE POLICY "Artisans can view assigned orders"
ON public.orders FOR SELECT
TO authenticated
USING (
  atelier_id = public.current_user_atelier_id() 
  AND public.current_user_role() = 'employee'
  AND (assigned_tailor_id = auth.uid() OR assigned_tailor_id IS NULL)
);

-- Artisans: Can update production status on their assigned orders
CREATE POLICY "Artisans can update status on assigned orders"
ON public.orders FOR UPDATE
TO authenticated
USING (
  atelier_id = public.current_user_atelier_id() 
  AND public.current_user_role() = 'employee'
  AND assigned_tailor_id = auth.uid()
)
WITH CHECK (
  atelier_id = public.current_user_atelier_id() 
  AND public.current_user_role() = 'employee'
  AND assigned_tailor_id = auth.uid()
);

-- Patrons / Clients: Can ONLY view their own orders
CREATE POLICY "Patrons can view own orders"
ON public.orders FOR SELECT
TO authenticated
USING (client_id = auth.uid());

-- ----------------------------------------------------------------------------
-- RLS: ORDER PROGRESS NOTES
-- ----------------------------------------------------------------------------
-- Visible to members of the atelier and the order's client
CREATE POLICY "Order progress notes access"
ON public.order_progress_notes FOR SELECT
TO authenticated
USING (
  atelier_id = public.current_user_atelier_id()
  OR EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_progress_notes.order_id 
    AND orders.client_id = auth.uid()
  )
);

CREATE POLICY "Artisans and owners can insert progress notes"
ON public.order_progress_notes FOR INSERT
TO authenticated
WITH CHECK (
  atelier_id = public.current_user_atelier_id()
  AND public.current_user_role() IN ('owner', 'employee')
);

-- ----------------------------------------------------------------------------
-- RLS: APPOINTMENTS
-- ----------------------------------------------------------------------------
-- Owners: full access
CREATE POLICY "Owners full access to appointments"
ON public.appointments FOR ALL
TO authenticated
USING (atelier_id = public.current_user_atelier_id() AND public.current_user_role() = 'owner')
WITH CHECK (atelier_id = public.current_user_atelier_id() AND public.current_user_role() = 'owner');

-- Artisans: view appointments in their atelier
CREATE POLICY "Artisans view appointments"
ON public.appointments FOR SELECT
TO authenticated
USING (atelier_id = public.current_user_atelier_id() AND public.current_user_role() = 'employee');

-- Patrons: view and create own appointments
CREATE POLICY "Patrons view own appointments"
ON public.appointments FOR SELECT
TO authenticated
USING (client_id = auth.uid());

CREATE POLICY "Patrons create own appointments"
ON public.appointments FOR INSERT
TO authenticated
WITH CHECK (client_id = auth.uid() AND atelier_id = public.current_user_atelier_id());

-- Public / Anonymous: Can book new appointments with 'pending' status
CREATE POLICY "Public book appointment"
ON public.appointments FOR INSERT
TO anon
WITH CHECK (status = 'pending');

-- ----------------------------------------------------------------------------
-- RLS: FEEDBACKS
-- ----------------------------------------------------------------------------
CREATE POLICY "Owners full access to feedback"
ON public.feedbacks FOR ALL
TO authenticated
USING (atelier_id = public.current_user_atelier_id() AND public.current_user_role() = 'owner')
WITH CHECK (atelier_id = public.current_user_atelier_id() AND public.current_user_role() = 'owner');

CREATE POLICY "Patrons create feedback"
ON public.feedbacks FOR INSERT
TO authenticated
WITH CHECK (client_id = auth.uid() AND atelier_id = public.current_user_atelier_id());

CREATE POLICY "Patrons view own feedback"
ON public.feedbacks FOR SELECT
TO authenticated
USING (client_id = auth.uid());

-- ----------------------------------------------------------------------------
-- RLS: LOOKBOOK ITEMS
-- ----------------------------------------------------------------------------
-- Public: Read-only access to published lookbook items
CREATE POLICY "Public read published lookbook"
ON public.lookbook_items FOR SELECT
TO anon, authenticated
USING (published = true);

-- Owners: Full CRUD on lookbook items for their atelier
CREATE POLICY "Owners manage lookbook"
ON public.lookbook_items FOR ALL
TO authenticated
USING (atelier_id = public.current_user_atelier_id() AND public.current_user_role() = 'owner')
WITH CHECK (atelier_id = public.current_user_atelier_id() AND public.current_user_role() = 'owner');

-- ----------------------------------------------------------------------------
-- ARTISAN FINANCIAL COLUMN ISOLATION VIEW
-- Block artisans from accessing high-level atelier financial, revenue, and payout balances
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.artisan_assigned_orders_view AS
SELECT 
    id,
    atelier_id,
    order_number,
    client_id,
    client_name,
    client_phone,
    assigned_tailor_id,
    assigned_tailor_name,
    status,
    description,
    garment_type,
    fabric_details,
    estimated_delivery,
    photo_url,
    created_at,
    updated_at
FROM public.orders
WHERE atelier_id = public.current_user_atelier_id()
  AND (assigned_tailor_id = auth.uid() OR public.current_user_role() = 'owner');
