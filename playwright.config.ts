import { defineConfig, devices } from '@playwright/test';

/**
 * The suite runs in one of two modes:
 *
 *   - Hermetic (default): Playwright starts a preview server against a build it
 *     did not produce, so `scripts/e2e/hermetic.sh` must have built it already.
 *     Traces and screenshots are retained on failure because this is the mode a
 *     developer debugs in.
 *   - Remote: `STITCHFLOW_E2E_BASE_URL` names an already-running host. Playwright
 *     never starts a server, so it cannot accidentally test a local build while
 *     the operator believes they tested the deployment.
 */
const previewPort = process.env.STITCHFLOW_E2E_PREVIEW_PORT ?? '4173';
const baseURL = process.env.STITCHFLOW_E2E_BASE_URL || `http://127.0.0.1:${previewPort}`;
const usesLocalPreview = !process.env.STITCHFLOW_E2E_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: usesLocalPreview ? 'retain-on-failure' : 'off',
    screenshot: usesLocalPreview ? 'only-on-failure' : 'off',
  },
  webServer: usesLocalPreview
    ? {
        command: `npm run preview -- --host 127.0.0.1 --port ${previewPort}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
      }
    : undefined,
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
