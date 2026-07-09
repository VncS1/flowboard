import { expect, test } from "@playwright/test";

import {
  dragCardToColumn,
  gotoBoardAndWaitForSocket,
  seedBoardWithCard,
  signupViaUi,
  uniqueUser,
} from "./helpers.js";

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
