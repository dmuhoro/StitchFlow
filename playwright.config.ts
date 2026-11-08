import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.STITCHFLOW_E2E_BASE_URL || 'http://127.0.0.1:4173';
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
        command: 'npm run preview -- --host 127.0.0.1 --port 4173',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
      }
    : undefined,
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
