import { expect, test } from '@playwright/test';
import { HEADER_SIGN_IN_LABEL, LANDING_SIGN_IN_LABEL } from './support/fixtures';

/**
 * Two sign-in affordances exist and they are not interchangeable: the landing
 * hero opens the access dialog, and the header control is a separate button.
 * When both carried the same accessible name, a strict locator matched two
 * elements and every protected flow failed before it reached its assertion.
 *
 * This test pins the contract from both sides: the landing control is unique,
 * and the header control has its own distinct name.
 */
test('public entry renders and its sign-in action opens the auth dialog', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();

  const landingSignIn = page.getByRole('button', { name: LANDING_SIGN_IN_LABEL, exact: true });
  await expect(landingSignIn).toHaveCount(1);

  // The header control keeps its own name; it must never reuse the landing label.
  await expect(page.getByRole('button', { name: HEADER_SIGN_IN_LABEL, exact: true })).toHaveCount(1);

  await landingSignIn.click();
  await expect(
    page.getByRole('heading', { name: /^(Atelier Access|Atelier Sign In)$/i }),
  ).toBeVisible();
});
