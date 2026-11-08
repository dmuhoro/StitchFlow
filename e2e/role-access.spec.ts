import { test, expect } from '@playwright/test';

const roleFixtures = [
  {
    name: 'owner',
    email: process.env.STITCHFLOW_E2E_OWNER_EMAIL,
    password: process.env.STITCHFLOW_E2E_OWNER_PASSWORD,
    workspace: 'Atelier Director & Founder Suite',
    ownerAction: true,
  },
  {
    name: 'employee',
    email: process.env.STITCHFLOW_E2E_EMPLOYEE_EMAIL,
    password: process.env.STITCHFLOW_E2E_EMPLOYEE_PASSWORD,
    workspace: 'Master African Artisan Workbench',
    ownerAction: false,
  },
  {
    name: 'patron',
    email: process.env.STITCHFLOW_E2E_PATRON_EMAIL,
    password: process.env.STITCHFLOW_E2E_PATRON_PASSWORD,
    workspace: 'VIP Bespoke Patron',
    ownerAction: false,
  },
];

for (const fixture of roleFixtures) {
  test(`${fixture.name} signs in to the matching atelier workspace`, async ({ page }) => {
    test.skip(!fixture.email || !fixture.password, `Set STITCHFLOW_E2E_${fixture.name.toUpperCase()}_EMAIL and _PASSWORD for the hosted ${fixture.name} flow.`);

    await page.goto('/');
    await page.getByRole('button', { name: 'Atelier Sign In' }).click();
    await page.getByLabel('Email').fill(fixture.email!);
    await page.getByLabel('Password').fill(fixture.password!);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText(fixture.workspace, { exact: false })).toBeVisible({ timeout: 15000 });
    if (fixture.ownerAction) {
      await expect(page.getByRole('button', { name: 'New Cultural Commission' })).toBeVisible();
    } else {
      await expect(page.getByRole('button', { name: 'New Cultural Commission' })).toHaveCount(0);
    }
  });
}
