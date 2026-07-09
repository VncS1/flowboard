import { defineConfig, devices } from "@playwright/test";

const WEB_URL = "http://localhost:3000";
const API_URL = "http://localhost:4000";

// Shared only between the two webServer processes below, for the duration of the
// E2E run against the isolated flowboard_test database — never the dev secret.
const E2E_JWT_SECRET = "e2e-test-secret";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "dot" : "list",
  use: {
    baseURL: WEB_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command:
        "npm run dev:db && npm run prisma:migrate:deploy --workspace apps/server && npm run dev --workspace apps/server",
      cwd: "..",
      url: `${API_URL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        DATABASE_URL:
          "postgresql://flowboard:flowboard@localhost:5432/flowboard_test?schema=public",
        JWT_SECRET: E2E_JWT_SECRET,
        CORS_ORIGIN: WEB_URL,
        PORT: "4000",
      },
    },
    {
      command: "npm run dev --workspace apps/web",
      cwd: "..",
      url: WEB_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        JWT_SECRET: E2E_JWT_SECRET,
        NEXT_PUBLIC_API_URL: API_URL,
        NEXT_PUBLIC_WS_URL: "ws://localhost:4000",
      },
    },
  ],
});
