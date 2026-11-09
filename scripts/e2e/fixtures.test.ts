import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bookingDate, nextServableDate } from '../../e2e/support/fixtures';

describe('tracked E2E environment', () => {
  it('is Supabase-mode, loopback-only, and contains no credentials or fixed booking date', () => {
    const config = readFileSync(new URL('../../.env.test', import.meta.url), 'utf8');

    expect(config).toContain('VITE_DATA_MODE=supabase');
    expect(config).toMatch(/^VITE_SUPABASE_URL=http:\/\/127\.0\.0\.1:\d+$/m);
    expect(config).not.toMatch(/https:\/\/[a-z0-9-]+\.supabase\.co/i);
    expect(config).not.toContain('qkhfjlxhulekjrfgrdbz');
    expect(config).not.toMatch(/^STITCHFLOW_E2E_.*_PASSWORD=/m);
    expect(config).not.toMatch(/^STITCHFLOW_E2E_BOOKING_DATE=/m);
    expect(config).toMatch(/^STITCHFLOW_E2E_ATELIER_ID=[0-9a-f-]{36}$/m);
  });
});

describe('dynamic booking-date fixture', () => {
  it('calculates the horizon from the atelier calendar, not the runner timezone', () => {
    expect(bookingDate(new Date('2026-11-06T21:30:00.000Z'), 3)).toBe('2026-11-10');
  });

  it("skips the atelier's closed Sunday when the horizon lands on it", () => {
    expect(bookingDate(new Date('2026-11-05T21:30:00.000Z'), 2)).toBe('2026-11-09');
  });

  it('moves an explicitly supplied closed Sunday to the next servable day', () => {
    expect(nextServableDate('2026-11-08')).toBe('2026-11-09');
  });
});
