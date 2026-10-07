import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  // Software WebGL renders the full post stack slowly; parallel browsers starve each other.
  workers: 1,
  // Model loading can take a few seconds under software WebGL.
  expect: { timeout: 20_000 },
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
      },
    },
    // Safari engine check: npm run test:safari
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 720 } } },
  ],
  webServer: { command: 'npm run dev -- --port 5173', url: 'http://localhost:5173', reuseExistingServer: true },
});
