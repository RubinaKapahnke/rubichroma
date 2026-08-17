import { defineConfig, devices } from '@playwright/test';

const testServerUrl = 'http://127.0.0.1:43028';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: { baseURL: testServerUrl, trace: 'retain-on-failure' },
  webServer: {
    command: `"${process.execPath}" node_modules/@angular/cli/bin/ng.js serve --host 127.0.0.1 --port 43028`,
    url: testServerUrl,
    reuseExistingServer: true,
  },
  projects: [
    {
      name: 'desktop-chromium',
      testIgnore: /.*\.mobile\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'smartphone-chromium-375',
      testMatch: /.*\.mobile\.spec\.ts/,
      use: {
        browserName: 'chromium',
        viewport: { width: 375, height: 667 },
        deviceScaleFactor: 2,
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: 'smartphone-chromium-390',
      testMatch: /.*\.mobile\.spec\.ts/,
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: 'smartphone-webkit-375',
      testMatch: /.*\.mobile\.spec\.ts/,
      use: {
        ...devices['iPhone SE'],
        viewport: { width: 375, height: 667 },
      },
    },
    {
      name: 'smartphone-webkit-390',
      testMatch: /.*\.mobile\.spec\.ts/,
      use: {
        ...devices['iPhone 13'],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
});
