import { test, expect } from '@playwright/test';

const email = process.env.STITCHFLOW_E2E_OWNER_EMAIL;
const password = process.env.STITCHFLOW_E2E_OWNER_PASSWORD;
const resourceName = process.env.STITCHFLOW_E2E_BOOKING_RESOURCE_NAME;
const bookingDate = process.env.STITCHFLOW_E2E_BOOKING_DATE;
const bookingTime = process.env.STITCHFLOW_E2E_BOOKING_TIME;
const hasFixture = Boolean(email && password && resourceName && bookingDate && bookingTime);

test.describe('protected fitting confirmation', () => {
  test.skip(!hasFixture, 'Set the owner account and a unique pending request/resource/date/time fixture to run this live flow.');

  test('uses availability, holds a resource, confirms it, and shows the persisted booking', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Atelier sign in/i }).click();
    await page.getByLabel('Email').fill(email!);
    const passwordInput = page.getByLabel('Password');
    await passwordInput.fill(password!);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    if (await passwordInput.count()) {
      await passwordInput.fill('');
      await page.getByLabel('Email').fill('');
    }

    await expect(page.getByText('Atelier Director & Founder Suite')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /Fitting Queue/ }).click();
    await expect(page.getByText('Protected fitting bookings')).toBeVisible({ timeout: 15000 });

    const request = page.getByRole('button').filter({ hasText: 'Ruracio bridal basted fitting' });
    await expect(request).toHaveCount(1);
    await request.click();
    await page.getByLabel('Fitting resource').selectOption({ label: resourceName! });
    await page.getByLabel(/Date \(/).fill(bookingDate!);
    const slot = page.getByRole('button', { name: bookingTime!, exact: true });
    await expect(slot).toBeVisible({ timeout: 15000 });
    await slot.click();
    await page.getByRole('button', { name: 'Hold and confirm fitting' }).click();

    await expect(page.getByText('Fitting confirmed and the resource slot is reserved.')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Held and confirmed resource slots')).toBeVisible();
    await expect(page.getByText('confirmed', { exact: true }).last()).toBeVisible();
  });
});
