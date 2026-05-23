import { expect, test } from "@playwright/test";

test.describe("Prediction Flow", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!process.env.TEST_EMAIL || !process.env.TEST_PASSWORD, "TEST_EMAIL and TEST_PASSWORD are required.");

    await page.goto("/sign-in");
    await page.fill('[name="email"]', process.env.TEST_EMAIL!);
    await page.fill('[name="password"]', process.env.TEST_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");
  });

  test("uploads an image and waits for diagnosis result", async ({ page }) => {
    await page.goto("/dashboard/diagnosis");
    await page.locator('input[type="file"]').first().setInputFiles("tests/fixtures/tomato_healthy.jpg");
    await expect(page.locator('img[alt*="Preview"]')).toBeVisible();
    await page.click('button:has-text("Bat dau chan doan")');
    await expect(page.locator('[data-testid="result-card"]')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('[data-testid="severity-badge"]')).toBeVisible();
  });

  test("shows an error when uploading a non-image file", async ({ page }) => {
    await page.goto("/dashboard/diagnosis");
    await page.locator('input[type="file"]').first().setInputFiles("tests/fixtures/not-image.txt");
    await expect(page.locator("[role=alert]")).toContainText("Định dạng không hợp lệ");
  });
});
