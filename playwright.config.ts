import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: false,
    timeout: 30_000,
    use: {
        baseURL: 'http://localhost:3107',
        trace: 'retain-on-failure'
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } }
    ],
    webServer: {
        command: 'npx next dev tests/e2e/fixture -p 3107',
        url: 'http://localhost:3107',
        reuseExistingServer: true,
        timeout: 120_000
    }
});
