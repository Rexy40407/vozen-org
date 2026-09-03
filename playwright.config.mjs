import { defineConfig } from '@playwright/test';

const port = Number(process.env.PREVIEW_PORT || 4177);
const baseURL = process.env.PREVIEW_ORIGIN || `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  workers: 2,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'line',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: process.env.PREVIEW_ORIGIN ? undefined : {
    command: `node tools/serve-site.mjs ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
