import { defineConfig, devices } from '@playwright/test'

// E2E tests run against the Docker stack (docker compose up -d), like a real user.
// Override the target with E2E_BASE_URL, e.g. E2E_BASE_URL=http://localhost:5173 for the Vite dev server.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Persona Gérard: CRT screen locked at 800x600 (see docs/PERSONAS.md)
      name: 'crt-800x600',
      use: { ...devices['Desktop Chrome'], viewport: { width: 800, height: 600 } },
    },
  ],
})
