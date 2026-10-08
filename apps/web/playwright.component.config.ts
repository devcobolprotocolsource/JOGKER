import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './src',
  testMatch: ['**/*.test.tsx'],
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
