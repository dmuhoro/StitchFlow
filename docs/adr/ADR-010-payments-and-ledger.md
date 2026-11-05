# ADR-010 — Payments: append-only ledger, idempotent webhooks, derived balances

**Status:** Proposed — awaiting owner approval
**Date:** 2026-11-05

## Context

`order_financials` is a mutable table with `deposit_amount`, `balance_due`, and `currency`. Owners
can update it in place. There is no payment record, no provider reference, no idempotency key, no
webhook event store, no ledger, no refund model, no tax model, and no reconciliation. A duplicated
M-Pesa callback or a browser retry could double-credit an order, and a mistaken edit silently
rewrites history.

The Constitution currently says balances live only in `order_financials` and are never duplicated
onto `orders`. That rule is right about duplication, but it does not define how a balance is
derived. Payments must be append-only: a correction is a new reversing entry, never an update to a
past amount.

## Decision

1. **The ledger is the source of truth.** Add:
   - `ledger_accounts`: tenant-scoped chart of accounts (`client_receivable`, `cash`,
     `mobile_money`, `card_clearing`, `deposit_liability`, `tax_payable`, `revenue`, `refunds`).
   - `ledger_transactions`: `atelier_id`, `kind` (`opening_balance`, `invoice`, `payment`, `refund`,
     `adjustment`, `reconciliation`), `currency`, `occurred_at`, `source_type`, `source_id`,
     `idempotency_key`, `reverses_transaction_id`, `created_by`.
   - `ledger_entries`: `transaction_id`, `account_code`, signed `amount numeric(12,2)`, `currency`,
     `order_id` (nullable), `payment_id` (nullable).

   For each transaction, the sum of signed amounts must be zero in that currency. A deferred
   constraint trigger enforces this at commit, so a half-written transaction cannot land.
   Transactions and entries are append-only: `update` and `delete` are revoked from every
   application role, and a trigger raises on any attempt. Corrections use a reversing transaction.
2. **Balances are derived, never written.** `order_financials` becomes a read-only view over the
   ledger that exposes the existing contract (`order_id`, `atelier_id`, `deposit_amount`,
   `balance_due`, `currency`, `updated_at`). There is no second mutable copy of a balance. The view
   is `security_invoker`, and write grants are revoked. This preserves Article III's "balances live
   only in `order_financials`" by making that name the projection, and it removes the last
   hand-editable money field.
3. **Payments are provider events, not UI state.** Add:
   - `payment_intents`: `atelier_id`, `order_id`, `provider` (`mpesa`, `card_ngn`), `provider_ref`,
     `amount`, `currency`, `status`, `idempotency_key`, `expires_at`.
   - `payments`: confirmed provider payment with `provider`, `provider_ref`, `amount`, `currency`,
     `fee_amount`, `paid_at`, `status` (`succeeded`, `failed`, `refunded`), and a unique
     `(provider, provider_ref)`.

   The amount displayed to the customer and the amount posted to the ledger must match the provider
   confirmation. A mismatch is a reconciliation exception, not a silent success.
4. **Webhooks are verified, idempotent, and replay-safe.**
   - Every provider callback is verified against its signature over the raw body.
   - `webhook_events` stores `(provider, provider_event_id)` uniquely, the payload hash, the
     received time, and the processing result.
   - Processing runs inside one transaction that inserts the event, records the payment, and posts
     the ledger transaction. A duplicate delivery hits the unique key and returns the previous
     result with HTTP 200. It cannot double-credit.
   - A failed or delayed callback is retried; the daily reconciliation job compares provider
     statements to `payments` and `ledger_transactions`, and opens an exception for every gap.
5. **Currency and tax are tenant rules, not hardcoded arithmetic.**
   - All amounts are stored in their transaction currency as `numeric(12,2)`. There is no FX
     conversion at read time. The current `KES`-relative conversion in `formatCurrency` is removed.
   - `currency` is constrained to the tenant's supported set (`KES`, `USD`, `NGN`).
   - `tax_rules` is versioned per tenant with effective dates and rates; a payment/invoice stores the
     tax lines it applied. A rate change never rewrites history.
6. **Refunds and failures.** A refund is a reversing ledger transaction plus a provider refund
   record. A failed payment is stored as `failed` with its provider reason; it posts no money and
   does not reduce the balance. The customer sees the failure and the reason.
7. **Server-only secrets and provider adapters.** M-Pesa STK push and one card/NGN gateway are
   implemented behind a server-side `PaymentProvider` interface. Provider keys, passkeys, and
   webhook secrets live in the host secret store, never in `VITE_*` variables, the repository, logs,
   or evidence files. The browser initiates a payment intent; it never posts a ledger entry.
8. **Migration and backfill.** The existing `order_financials` rows are backfilled into an
   `opening_balance` transaction per order, reviewed against the old values. After the client reads
   the view and the reconciliation report matches, the table is renamed to
   `order_financials_legacy` in a forward-only migration and the view takes its name. The legacy
   table is dropped only after a documented retention window.

## Constitutional amendment proposed

Article III is clarified as follows, effective when this ADR is accepted:

- A balance is derived from immutable ledger entries and exposed only through the
  `order_financials` projection. No client, owner, or server function writes a balance directly.
- A payment, refund, or adjustment is append-only; a correction is a reversing entry.
- The ledger sums to zero per transaction and currency, and every entry is `numeric(12,2)`.

The existing rules on patron read-only access, artisan exclusion, supported currencies, and failure
visibility remain unchanged.

## Consequences

- A duplicated webhook, a browser retry, and a double-click all converge on one payment.
- Every balance can be explained by a list of immutable entries, which is what an audit and a
  reconciliation require.
- The owner loses the ability to "fix" a balance by typing a new number. Corrections require an
  adjustment entry with a reason, which is the intended friction.
- Sprint 4 must ship the ledger, the view, provider adapters, webhook verification, reconciliation,
  and tests for duplicate/failed/replayed payments before any money is taken.
- Reporting becomes a ledger query; dashboards read a projection, not mutable totals.

## Alternatives considered

- **Keep the mutable `order_financials` table and add an audit log.** Rejected: an audit log records
  changes but the current value can still be wrong, and concurrent writes can lose an update.
- **Single-entry payments table with a computed balance.** Better than mutable totals, but refunds,
  fees, tax, and reconciliation need both sides of the money movement. Double-entry is the smaller
  long-term model.
- **Store integer minor units.** Valid for many systems, but the existing contract and Constitution
  use `numeric(12,2)`, and Postgres numeric is exact. Changing the unit now adds migration risk
  without a correctness gain.
- **Process webhooks in the browser or an unauthenticated edge function without an event store.**
  Rejected: replay and duplicate delivery are guaranteed, not hypothetical.
