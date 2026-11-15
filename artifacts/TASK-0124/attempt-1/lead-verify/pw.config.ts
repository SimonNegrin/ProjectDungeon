import { defineConfig, devices } from '@playwright/test';

// Verificación del lead: reutiliza el Vite ya arrancado en 4173.
export default defineConfig({
  testDir: '.',
  use: { baseURL: 'http://127.0.0.1:4173' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
