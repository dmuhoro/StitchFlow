import { expect, test } from '@playwright/test';

test('public entry renders and its sign-in action opens the auth dialog', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();

  const landingSignIn = page.getByRole('button', { name: 'Atelier sign in', exact: true });
  await expect(landingSignIn).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Atelier Sign In', exact: true })).toHaveCount(0);
  await landingSignIn.click();
  await expect(
    page.getByRole('heading', { name: /^(Atelier Access|Atelier Sign In)$/i }),
  ).toBeVisible();
});
