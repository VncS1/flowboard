import { expect, test } from "@playwright/test";

import {
  beginDrag,
  captureBoardSocketFrames,
  dropOnColumn,
  gotoBoardAndWaitForSocket,
  seedBoardWithCard,
  signupViaUi,
  uniqueUser,
} from "./helpers.js";

function receivedConflict(frames: string[]): boolean {
  return frames.some((frame) => {
    try {
      return (JSON.parse(frame) as { type?: string }).type === "card:conflict";
    } catch {
      return false;
    }
  });
}

test("near-simultaneous moves on the same card: no lost update, loser gets a visible conflict", async ({
  browser,
}) => {
  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();

  const user = uniqueUser("race");
  await signupViaUi(pageA, user);
  const { boardId } = await seedBoardWithCard(
    pageA.request,
    "Race Board",
    "Todo",
    "Contested card",
  );

  const framesA = captureBoardSocketFrames(pageA);
  await gotoBoardAndWaitForSocket(pageA, boardId);

  const contextB = await browser.newContext({ storageState: await contextA.storageState() });
  const pageB = await contextB.newPage();
  const framesB = captureBoardSocketFrames(pageB);
  await gotoBoardAndWaitForSocket(pageB, boardId);

  // Both pages loaded the card at the same starting version. Arm both drags first (purely
  // local dnd-kit state, no network), then fire both drops back-to-back so the two
  // card:move sends land on the server as close together as possible — otherwise the first
  // move's board:sync broadcast can update the second page's local version before it drops,
  // turning this into two sequential successful moves instead of an actual race.
  await beginDrag(pageA, "Contested card");
  await beginDrag(pageB, "Contested card");
  await Promise.all([dropOnColumn(pageA, "Doing"), dropOnColumn(pageB, "Done")]);

  // Exactly one side's move must be rejected as a stale-version conflict — never both, and
  // never neither (that would mean the version check didn't do its job).
  await expect
    .poll(() => receivedConflict(framesA) !== receivedConflict(framesB), { timeout: 10_000 })
    .toBe(true);

  const columnLocator = (page: typeof pageA, name: string) =>
    page.locator("section").filter({ has: page.getByRole("heading", { name } as never) });

  async function cardColumn(page: typeof pageA): Promise<"Doing" | "Done" | null> {
    if (await columnLocator(page, "Doing").getByText("Contested card").isVisible()) return "Doing";
    if (await columnLocator(page, "Done").getByText("Contested card").isVisible()) return "Done";
    return null;
  }

  // Whichever column actually won on the server, both clients must agree on it — the losing
  // side's optimistic guess must have been rolled back and resynced (via router.refresh(), a
  // real network round trip), not left dangling. Give that resync generous time to land.
  await expect
    .poll(
      async () => {
        const [a, b] = await Promise.all([cardColumn(pageA), cardColumn(pageB)]);
        return a !== null && a === b;
      },
      { timeout: 15_000 },
    )
    .toBe(true);

  const winningColumn = await cardColumn(pageA);
  const losingColumn = winningColumn === "Doing" ? "Done" : "Doing";

  await expect(columnLocator(pageA, losingColumn).getByText("Contested card")).not.toBeVisible();
  await expect(columnLocator(pageB, losingColumn).getByText("Contested card")).not.toBeVisible();
  await expect(
    pageA
      .locator("section")
      .filter({ has: pageA.getByRole("heading", { name: "Todo" }) })
      .getByText("Contested card"),
  ).not.toBeVisible();

  await contextA.close();
  await contextB.close();
});
