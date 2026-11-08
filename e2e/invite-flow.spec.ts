import { test, expect } from '@playwright/test';

const email = process.env.STITCHFLOW_E2E_EMAIL;
const password = process.env.STITCHFLOW_E2E_PASSWORD;
const invitationCode = process.env.STITCHFLOW_E2E_INVITE_CODE;
const expectedRole = process.env.STITCHFLOW_E2E_EXPECTED_ROLE || 'employee';

const hasHostedFixture = Boolean(email && password && invitationCode);

test.describe('invitation-code acceptance', () => {
  test.skip(!hasHostedFixture, 'Set STITCHFLOW_E2E_EMAIL, STITCHFLOW_E2E_PASSWORD, and STITCHFLOW_E2E_INVITE_CODE to run the live Supabase flow.');

  test('accepts an invitation and shows the assigned atelier membership role', async ({ page }) => {
    await page.goto(`/?invite=${encodeURIComponent(invitationCode!)}`);

    await expect(page.getByRole('heading', { name: 'Accept Invitation' })).toBeVisible();
    await page.getByLabel('Email').fill(email!);
    // The password field is revealed by the explicit "I have a password" toggle;
    // the screen defaults to a magic link so an invitee cannot be phished into
    // typing a password they do not have.
    await page.getByRole('button', { name: 'I have a password' }).click();
    const passwordInput = page.getByLabel('Password');
    await passwordInput.fill(password!);
    await page.getByRole('button', { name: 'Sign in and continue' }).click();
    if (await passwordInput.count()) {
      await passwordInput.fill('');
      await page.getByLabel('Email').fill('');
    }

    await expect(page.getByText(new RegExp(`Signed in as\\s+${email!.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}`, 'i'))).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Redeem invitation' }).click();

    await expect(page.getByRole('heading', { name: 'Invitation accepted' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(new RegExp(`Membership role:\\s*${expectedRole}`, 'i'))).toBeVisible();
  });
});
