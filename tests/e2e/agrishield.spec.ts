/**
 * Kabul testleri (AGRISHIELD_PROMPT.md 17.1 · Playwright):
 *   1. Ana sayfa yüklenir, hero'daki üç sayaç veri gösterir.
 *   2. Kuraklık senaryosu → tanık çipleri sırayla yeşile döner, 60 sn içinde ÖDE rozeti.
 *   3. /k/[kod] açılır, üç tanık kartı ve evidenceHash görünür (ve tarayıcıda doğrulanır).
 *   4. Manipülasyon senaryosu → GRİ BÖLGE rozeti.
 *   5. /durum tüm bileşenleri listeler.
 *   6. /asistan "Neden blokzincir?" sorusuna kaynaklı cevap döner.
 *   7. 3D, WebGL kapalı tarayıcıda 2B yedeğe düşer → ayrı dosya: fallback-2d.spec.ts
 */
import { expect, test } from "@playwright/test";
import { resetStage, runScenario } from "./helpers";

test.afterAll(async ({ request }) => {
  await resetStage(request);
});

test("1 · ana sayfa: hero'daki üç sayaç veri gösterir", async ({ page }) => {
  await page.goto("/");
  const counters = page.getByTestId("hero-counters");
  await expect(counters).toBeVisible();
  await expect(page.getByTestId("counter-parcels")).toHaveText("3");
  await expect(page.getByTestId("counter-status")).toContainText("çalışıyor");
  await expect(page.getByTestId("counter-decision")).not.toBeEmpty();
});

test("2 · kuraklık: tanıklar yeşile döner, 60 sn içinde ÖDE", async ({ page, request }) => {
  await page.goto("/#demo");
  const panel = page.getByTestId("witness-panel").first();
  await expect(panel).toBeVisible();
  await runScenario(request, "kuraklik-2025", 4);
  // meteoroloji Nisan başında, istasyon ve uydu 28 Nisan'da EVET der
  await expect(panel.getByTestId("chip-meteo")).toHaveAttribute("data-verdict", "EVET", { timeout: 30_000 });
  await expect(panel.getByTestId("chip-station")).toHaveAttribute("data-verdict", "EVET", { timeout: 45_000 });
  await expect(panel.getByTestId("chip-satellite")).toHaveAttribute("data-verdict", "EVET", { timeout: 45_000 });
  await expect(page.getByTestId("decision-pipeline").getByTestId("decision-ODE")).toBeVisible({ timeout: 60_000 });
});

test("3 · kanıt sayfası: üç tanık kartı + evidenceHash, tarayıcıda doğrulanır", async ({ page }) => {
  await page.goto("/k/7F3A?dogrula=1");
  await expect(page.getByTestId("proof-header")).toBeVisible();
  for (const w of ["witness-satellite", "witness-station", "witness-meteo"]) await expect(page.getByTestId(w)).toBeVisible();
  await expect(page.getByTestId("evidence-hash")).toContainText(/0x[0-9a-f]{64}/);
  // hash tarayıcıda yeniden hesaplanır; tek karakter değişince tutmaz
  await expect(page.getByTestId("verify-result")).toContainText("EŞLEŞİYOR");
  await page.getByRole("button", { name: "Bir rakamı değiştirmeyi dene" }).click();
  await page.locator("#sealed").press("End");
  await page.locator("#sealed").pressSequentially(" ");
  await expect(page.getByTestId("verify-result")).not.toContainText("EŞLEŞİYOR");
});

test("4 · manipülasyon: sulanan sensör → GRİ BÖLGE (ödemez)", async ({ page, request }) => {
  await page.goto("/#demo");
  await runScenario(request, "manipulasyon", 5);
  await expect(page.getByTestId("decision-pipeline").getByTestId("decision-GRI_BOLGE")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("decision-pipeline").getByTestId("decision-ODE")).toHaveCount(0);
});

test("5 · /durum tüm bileşenleri listeler", async ({ page }) => {
  await page.goto("/durum");
  await expect(page.getByTestId("status-overall")).toBeVisible();
  for (const k of ["db", "device", "chain", "ai", "sms", "sim", "stream"]) {
    const row = page.getByTestId(`health-${k}`);
    await expect(row).toBeVisible();
    await expect(row).not.toHaveAttribute("data-level", "error");
  }
});

test("6 · /asistan: 'Neden blokzincir?' kaynaklı cevap", async ({ page }) => {
  await page.goto("/asistan");
  await page.getByRole("button", { name: "Neden blokzincir?" }).first().click();
  const answer = page.getByTestId("assistant-answer").last();
  await expect(answer).toContainText(/blokzincir|zincir/i);
  await expect(answer.getByTestId("assistant-sources")).toBeVisible();
  await expect(answer.getByTestId("assistant-sources").locator("a").first()).toBeVisible();
});
