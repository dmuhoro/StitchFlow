import { test, expect } from '@playwright/test';
import { LANDING_SIGN_IN_LABEL, bookingFixture } from './support/fixtures';

/**
 * The booking journey needs a live pending request, a resource with a working
 * window, and an unclaimed slot. It is not a purchase flow: there is no "buy"
 * action in the product, so no buy selector is asserted here.
 *
 * The date is computed in `support/fixtures.ts` for the atelier's timezone, and
 * the hermetic runner resets the database before the suite. Together those make
 * the journey repeatable: a consumed slot cannot leak into the next run.
 */
const hasFixture = Boolean(
  bookingFixture.email && bookingFixture.password && bookingFixture.resourceName && bookingFixture.date && bookingFixture.time,
);

test.describe('protected fitting confirmation', () => {
  test.skip(
    !hasFixture,
    'Set the owner account plus a pending request, resource, date and time fixture to run this live flow.',
  );

  test('uses availability, holds a resource, confirms it, and shows the persisted booking', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: LANDING_SIGN_IN_LABEL, exact: true }).click();
    await page.getByLabel('Email').fill(bookingFixture.email!);
    const passwordInput = page.getByLabel('Password');
    await passwordInput.fill(bookingFixture.password!);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();

    // The dialog unmounts on success; touching its inputs here races that.
    await expect(page.getByText('Atelier Director & Founder Suite')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /Fitting Queue/ }).click();
    await expect(page.getByText('Protected fitting bookings')).toBeVisible({ timeout: 15000 });

    const request = page.getByRole('button').filter({ hasText: bookingFixture.requestLabel });
    await expect(request).toHaveCount(1);
    await request.click();
    await page.getByLabel('Fitting resource').selectOption({ label: bookingFixture.resourceName });
    await page.getByLabel(/Date \(/).fill(bookingFixture.date);
    const slot = page.getByRole('button', { name: bookingFixture.time, exact: true });
    await expect(slot).toBeVisible({ timeout: 15000 });
    await slot.click();
    await page.getByRole('button', { name: 'Hold and confirm fitting' }).click();

    await expect(page.getByText('Fitting confirmed and the resource slot is reserved.')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Held and confirmed resource slots')).toBeVisible();
    await expect(page.getByText('confirmed', { exact: true }).last()).toBeVisible();
  });
});
