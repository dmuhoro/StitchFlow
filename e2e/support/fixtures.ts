/**
 * Single source of truth for browser-test fixtures.
 *
 * Two rules drive this module:
 *
 * 1. A fixture is either explicit or absent. Nothing infers a value from a
 *    previous run, so a suite that consumed a slot yesterday cannot make today's
 *    run pass for the wrong reason.
 * 2. Defaults describe the tracked seed (`supabase/seed.sql`), not one hosted
 *    tenancy. A hermetic local stack is therefore self-sufficient, and a hosted
 *    run only has to override the values that genuinely differ.
 *
 * A missing credential still skips the protected flow. A missing *fixture value*
 * never silently falls back to a hosted-only identifier.
 */

const env = (name: string): string | undefined => {
  const value = process.env[name];
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

/**
 * The atelier operates on Nairobi wall-clock time, and its published
 * availability is Monday–Saturday 09:00–18:00 (`supabase/seed.sql`, section 5b).
 * A date computed in the runner's local timezone can land on a closed day for
 * the atelier, which would fail the booking journey for the wrong reason.
 */
export const ATELIER_TIME_ZONE = 'Africa/Nairobi';

/** Days ahead of "today" to request. Keeps the run clear of same-day cut-offs. */
export const BOOKING_HORIZON_DAYS = 3;

const NAIROBI_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: ATELIER_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * `YYYY-MM-DD` for the first servable day at or after today + horizon.
 *
 * Sunday is skipped because the seed publishes no Sunday window: the correct
 * behaviour for a closed day is "no slots", which is asserted by the database
 * suite, not by the booking journey.
 */
export function bookingDate(now: Date = new Date(), horizonDays: number = BOOKING_HORIZON_DAYS): string {
  const parts = NAIROBI_DATE.formatToParts(now);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);

  // Calendar arithmetic in UTC keeps this a pure date calculation with no
  // daylight-saving discontinuity and no timezone drift.
  const cursor = new Date(Date.UTC(read('year'), read('month') - 1, read('day')));
  cursor.setUTCDate(cursor.getUTCDate() + horizonDays);
  while (cursor.getUTCDay() === 0) cursor.setUTCDate(cursor.getUTCDate() + 1);

  return cursor.toISOString().slice(0, 10);
}

/** Returns the date unchanged when it is servable, otherwise the next open day. */
export function nextServableDate(date: string): string {
  const cursor = new Date(`${date}T00:00:00Z`);
  while (cursor.getUTCDay() === 0) cursor.setUTCDate(cursor.getUTCDate() + 1);
  return cursor.toISOString().slice(0, 10);
}

export interface RoleFixture {
  readonly name: 'owner' | 'employee' | 'patron';
  readonly email: string | undefined;
  readonly password: string | undefined;
  /** Heading rendered by the role's own workspace. */
  readonly workspace: string;
  /** Order code the role is allowed to read. */
  readonly ownOrder: string;
  /** Order code that belongs to the other tenancy and must never render. */
  readonly foreignOrder: string;
  readonly ownerAction: boolean;
}

/**
 * Order codes default to the tracked seed (`ORD-892` in Nairobi, `LAG-401` in
 * Lagos). Hosted runs override them because the hosted tenancy uses `PILOT-*`
 * codes.
 */
export const OWN_ORDER = env('STITCHFLOW_E2E_OWN_ORDER') ?? 'ORD-892';
export const FOREIGN_ORDER = env('STITCHFLOW_E2E_FOREIGN_ORDER') ?? 'LAG-401';

export const roleFixtures: readonly RoleFixture[] = [
  {
    name: 'owner',
    email: env('STITCHFLOW_E2E_OWNER_EMAIL'),
    password: env('STITCHFLOW_E2E_OWNER_PASSWORD'),
    workspace: 'Atelier Director & Founder Suite',
    ownOrder: OWN_ORDER,
    foreignOrder: FOREIGN_ORDER,
    ownerAction: true,
  },
  {
    name: 'employee',
    email: env('STITCHFLOW_E2E_EMPLOYEE_EMAIL'),
    password: env('STITCHFLOW_E2E_EMPLOYEE_PASSWORD'),
    workspace: 'Master African Artisan Workbench',
    ownOrder: OWN_ORDER,
    foreignOrder: FOREIGN_ORDER,
    ownerAction: false,
  },
  {
    name: 'patron',
    email: env('STITCHFLOW_E2E_PATRON_EMAIL'),
    password: env('STITCHFLOW_E2E_PATRON_PASSWORD'),
    workspace: 'VIP Bespoke Patron',
    ownOrder: OWN_ORDER,
    foreignOrder: FOREIGN_ORDER,
    ownerAction: false,
  },
];

export interface BookingFixture {
  readonly email: string | undefined;
  readonly password: string | undefined;
  /** Resource the owner reserves. Defaults to the seed fitting room. */
  readonly resourceName: string;
  readonly date: string;
  readonly time: string;
  /** Pending request the owner confirms into the reserved slot. */
  readonly requestLabel: string;
}

/**
 * The date is computed, never configured by hand. A hardcoded date is a test
 * that stops testing anything the day after it is written.
 */
export const bookingFixture: BookingFixture = {
  email: env('STITCHFLOW_E2E_OWNER_EMAIL'),
  password: env('STITCHFLOW_E2E_OWNER_PASSWORD'),
  resourceName: env('STITCHFLOW_E2E_BOOKING_RESOURCE_NAME') ?? 'Bridal & Ceremonial Fitting Room',
  date: nextServableDate(env('STITCHFLOW_E2E_BOOKING_DATE') ?? bookingDate()),
  time: env('STITCHFLOW_E2E_BOOKING_TIME') ?? '09:00',
  requestLabel: env('STITCHFLOW_E2E_BOOKING_REQUEST_LABEL') ?? 'Ruracio bridal basted fitting',
};

export interface InviteFixture {
  readonly email: string | undefined;
  readonly password: string | undefined;
  readonly code: string | undefined;
  readonly expectedRole: string;
}

export const inviteFixture: InviteFixture = {
  email: env('STITCHFLOW_E2E_EMAIL'),
  password: env('STITCHFLOW_E2E_PASSWORD'),
  code: env('STITCHFLOW_E2E_INVITE_CODE'),
  expectedRole: env('STITCHFLOW_E2E_EXPECTED_ROLE') ?? 'employee',
};

/** Label of the public landing-page sign-in control. */
export const LANDING_SIGN_IN_LABEL = 'Atelier sign in';

/** Label of the header control. Distinct on purpose: the two must not collide. */
export const HEADER_SIGN_IN_LABEL = 'Enter Atelier';
