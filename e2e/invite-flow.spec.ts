import { test, expect } from '@playwright/test';
import { inviteFixture } from './support/fixtures';

const { email, password, code, expectedRole } = inviteFixture;
const hasHostedFixture = Boolean(email && password && code);

test.describe('invitation-code acceptance', () => {
  test.skip(
    !hasHostedFixture,
    'Set STITCHFLOW_E2E_EMAIL, STITCHFLOW_E2E_PASSWORD, and STITCHFLOW_E2E_INVITE_CODE to run the invitation flow.',
  );

  test('accepts an invitation and shows the assigned atelier membership role', async ({ page }) => {
    await page.goto(`/?invite=${encodeURIComponent(code!)}`);

    await expect(page.getByRole('heading', { name: 'Accept Invitation' })).toBeVisible();
    await page.getByLabel('Email').fill(email!);
    // The password field is revealed by the explicit "I have a password" toggle;
    // the screen defaults to a magic link so an invitee cannot be phished into
    // typing a password they do not have.
    await page.getByRole('button', { name: 'I have a password' }).click();
    const passwordInput = page.getByLabel('Password');
    await passwordInput.fill(password!);
    await page.getByRole('button', { name: 'Sign in and continue' }).click();

    // The invitation screen swaps to its signed-in state; its inputs are gone.
    await expect(
      page.getByText(new RegExp(`Signed in as\\s+${email!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i')),
    ).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Redeem invitation' }).click();

    // The successful outcome is the redeemed membership, not the transient
    // confirmation card: the card unmounts as soon as the ?invite= parameter is
    // cleared, so asserting it is a race. The invitee must land in the workspace
    // for the role the invitation granted.
    await expect(page.getByText('Master African Artisan Workbench', { exact: false }).first()).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByText(new RegExp(`\\b${expectedRole}\\b`, 'i')).first()).toBeVisible();
  });
});
