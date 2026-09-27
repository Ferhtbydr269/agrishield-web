import { defineConfig, devices } from "@playwright/test";

/**
 * Uçtan uca testler (AGRISHIELD_PROMPT.md 17.1) — `npm run e2e`
 * Sunucu çalışıyorsa (npm run dev / stage) onu kullanır, yoksa `npm run dev`'i kendisi başlatır.
 * Tarayıcı: kurulu Google Chrome (PW_CHANNEL ile değiştirilebilir; Playwright'ın kendi Chromium'u için
 * `npx playwright install chromium` ve PW_CHANNEL=chromium).
 * Testler ortak simülasyon durumunu değiştirdiği için sırayla (tek işçi) koşar.
 */
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { outputFolder: "reports/e2e", open: "never" }]],
  use: {
    baseURL: BASE,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
  },
  projects: [
    {
      name: "chrome",
      use: { ...devices["Desktop Chrome"], channel: process.env.PW_CHANNEL === "chromium" ? undefined : (process.env.PW_CHANNEL ?? "chrome"), viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: `${BASE}/api/health`,
        reuseExistingServer: true,
        timeout: 180_000,
      },
});
