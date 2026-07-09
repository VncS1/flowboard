import { expect, test } from "@playwright/test";

import { dragCardToColumn, signupViaUi, uniqueUser } from "./helpers.js";

test("golden path: signup, create a board, create a card, and move it", async ({ page }) => {
  const user = uniqueUser("golden");
  await signupViaUi(page, user);

  await page.getByLabel(/board name/i).fill("Sprint Board");
  await page.getByRole("button", { name: /create board/i }).click();
  await page.waitForURL(/\/boards\/.+/);
  await expect(page.getByRole("heading", { level: 1, name: "Sprint Board" })).toBeVisible();

  const todoColumn = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Todo" }) });
  await todoColumn.getByLabel(/new card title/i).fill("Write the E2E suite");
  await todoColumn.getByRole("button", { name: /add card/i }).click();
  await expect(todoColumn.getByText("Write the E2E suite")).toBeVisible();

  await dragCardToColumn(page, "Write the E2E suite", "Doing");

  const doingColumn = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Doing" }) });
  await expect(doingColumn.getByText("Write the E2E suite")).toBeVisible();
  await expect(todoColumn.getByText("Write the E2E suite")).not.toBeVisible();

  // Reload to prove the move was persisted server-side, not just held in local state.
  await page.reload();
  await expect(doingColumn.getByText("Write the E2E suite")).toBeVisible();
});
