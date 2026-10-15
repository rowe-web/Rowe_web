import { defineConfig, devices } from "@playwright/test";

/**
 * Pruebas de navegador (scroll, animaciones, navegación).
 *   npm run test:e2e            → construye y arranca la web de producción en :3125
 *   E2E_URL=http://localhost:3000 npm run test:e2e   → contra un servidor ya arrancado
 */
const url = process.env.E2E_URL ?? "http://localhost:3125";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: url, trace: "retain-on-failure" },
  projects: [
    { name: "escritorio", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "movil", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
  ],
  webServer: process.env.E2E_URL
    ? undefined
    : {
        command: "npm run build && npx next start -p 3125",
        url,
        timeout: 300_000,
        reuseExistingServer: true,
        env: { NEXT_PUBLIC_E2E: "1" },
      },
});
