import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './playwright-tests',
    fullyParallel: true,
    retries: 2,
    timeout: 60_000,
    reporter: 'list',
    use: {
        baseURL: process.env.BASE_URL || 'http://localhost:8099',
        testIdAttribute: 'data-test-id',
        trace: 'on-first-retry',
        navigationTimeout: 45_000,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
