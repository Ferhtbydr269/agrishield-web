/** 7 · 3D saha, WebGL kapalı tarayıcıda 2B yedeğe düşer (AGRISHIELD_PROMPT.md 17.1). */
import { expect, test } from "@playwright/test";

test.use({ launchOptions: { args: ["--disable-webgl", "--disable-webgl2", "--disable-3d-apis"] } });

test("7 · WebGL yok → 2B saha görünümü", async ({ page }) => {
  await page.goto("/#saha");
  const webgl = await page.evaluate(() => {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  });
  expect(webgl).toBe(false);
  await expect(page.getByTestId("field-2d")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("field-3d")).toHaveCount(0);
});
