import { expect, test } from "@playwright/test";

import {
  dragCardToColumn,
  gotoBoardAndWaitForSocket,
  seedBoardWithCard,
  signupViaUi,
  uniqueUser,
} from "./helpers.js";

test("user B sees user A's new card live, with no refresh", async ({ browser }) => {
  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();

  const user = uniqueUser("create-sync");
  await signupViaUi(pageA, user);
  const { boardId } = await seedBoardWithCard(
    pageA.request,
    "Create Sync Board",
    "Todo",
    "Seed card",
  );

  await gotoBoardAndWaitForSocket(pageA, boardId);

  const contextB = await browser.newContext({ storageState: await contextA.storageState() });
  const pageB = await contextB.newPage();
  await gotoBoardAndWaitForSocket(pageB, boardId);

  const todoColumnA = pageA
    .locator("section")
    .filter({ has: pageA.getByRole("heading", { name: "Todo" }) });
  await todoColumnA.getByLabel(/new card title/i).fill("Card from A");
  await todoColumnA.getByRole("button", { name: /add card/i }).click();
  await expect(todoColumnA.getByText("Card from A")).toBeVisible();

  const todoColumnB = pageB
    .locator("section")
    .filter({ has: pageB.getByRole("heading", { name: "Todo" }) });
  // No reload on pageB: this must arrive via the board:sync WebSocket broadcast alone.
  await expect(todoColumnB.getByText("Card from A")).toBeVisible();

  await contextA.close();
  await contextB.close();
});

test("user B sees user A's card move live, with no refresh", async ({ browser }) => {
  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();

  const user = uniqueUser("sync");
  await signupViaUi(pageA, user);
  const { boardId } = await seedBoardWithCard(
    pageA.request,
    "Live Sync Board",
    "Todo",
    "Shared card",
  );

  await gotoBoardAndWaitForSocket(pageA, boardId);

  // Context B: a second simultaneous browser session for the same signed-in user,
  // sharing cookies via storageState (boards are single-owner — see boards.ts boardAccessGuard).
  const contextB = await browser.newContext({ storageState: await contextA.storageState() });
  const pageB = await contextB.newPage();
  await gotoBoardAndWaitForSocket(pageB, boardId);

  const doingColumnB = pageB
    .locator("section")
    .filter({ has: pageB.getByRole("heading", { name: "Doing" }) });
  const todoColumnB = pageB
    .locator("section")
    .filter({ has: pageB.getByRole("heading", { name: "Todo" }) });
  await expect(todoColumnB.getByText("Shared card")).toBeVisible();

  await dragCardToColumn(pageA, "Shared card", "Doing");

  // No reload on pageB: this must arrive via the board:sync WebSocket broadcast alone.
  await expect(doingColumnB.getByText("Shared card")).toBeVisible();
  await expect(todoColumnB.getByText("Shared card")).not.toBeVisible();

  await contextA.close();
  await contextB.close();
});
