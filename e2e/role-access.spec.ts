import { test, expect } from '@playwright/test';
import { LANDING_SIGN_IN_LABEL, roleFixtures } from './support/fixtures';

for (const fixture of roleFixtures) {
  test(`${fixture.name} signs in to the matching atelier workspace`, async ({ page }) => {
    test.skip(
      !fixture.email || !fixture.password,
      `Set STITCHFLOW_E2E_${fixture.name.toUpperCase()}_EMAIL and _PASSWORD for the ${fixture.name} flow.`,
    );

    await page.goto('/');
    await page.getByRole('button', { name: LANDING_SIGN_IN_LABEL, exact: true }).click();
    await page.getByLabel('Email').fill(fixture.email!);
    const passwordInput = page.getByLabel('Password');
    await passwordInput.fill(fixture.password!);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();

    // The access dialog unmounts when authentication succeeds. Do not touch its
    // inputs afterwards: a cleanup fill races the unmount and detaches mid-action.
    await expect(page.getByText(fixture.workspace, { exact: false })).toBeVisible({ timeout: 15000 });
    if (fixture.ownerAction) {
      await expect(page.getByRole('button', { name: 'New Cultural Commission' })).toBeVisible();
      await expect(page.getByText('Executive Production & Order Terms')).toBeVisible();
      await page.getByTitle('Atelier Settings & Preferences').click();
      await expect(page.getByText('Atelier Settings & Appearance')).toBeVisible();
    } else {
      await expect(page.getByRole('button', { name: 'New Cultural Commission' })).toHaveCount(0);
    }

    await expect(page.getByText(fixture.ownOrder, { exact: true })).toBeVisible();
    await expect(page.getByText(fixture.foreignOrder, { exact: true })).toHaveCount(0);
    if (fixture.name === 'employee') {
      await expect(page.getByText('Artisan Workbench Queue')).toBeVisible();
      await expect(page.getByText(/Outstanding order amounts/)).toHaveCount(0);
    }
    if (fixture.name === 'patron') {
      await expect(page.getByRole('heading', { name: 'My Fitting Requests' })).toBeVisible();
      await expect(page.getByText('Ruracio bridal basted fitting')).toBeVisible();
    }
  });
}
