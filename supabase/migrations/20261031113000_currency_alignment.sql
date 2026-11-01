-- ============================================================================
-- CURRENCY CONTRACT ALIGNMENT
-- ----------------------------------------------------------------------------
-- The hardening migration narrowed order_financials.currency to KES/USD while
-- the Pan-African pilot includes a Lagos tenant trading in NGN. A schema that
-- rejects its own seed is a defect, not a fixture problem.
--
-- Forward-only: widen the constraint, never edit the applied migration.
-- ============================================================================

alter table public.order_financials
  drop constraint if exists order_financials_currency_check;

alter table public.order_financials
  add constraint order_financials_currency_check
  check (currency in ('KES', 'USD', 'NGN'));

-- ateliers.default_currency arrived through the reconciliation migration without
-- a check. Pin it to the same supported set so settings cannot drift from money.
alter table public.ateliers
  drop constraint if exists ateliers_default_currency_check;

alter table public.ateliers
  add constraint ateliers_default_currency_check
  check (default_currency in ('KES', 'USD', 'NGN'));
