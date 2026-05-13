import { expect, test } from "playwright/test";

const shopflowState = process.env.SHOPFLOW_STATE || "normal";

test("shopflow checkout should complete payment", async ({ page }) => {
  await page.goto(`/shopflow?state=${shopflowState}`);
  await page.getByTestId("complete-payment").click();
  await expect(page.getByText("Payment Success")).toBeVisible();
});
