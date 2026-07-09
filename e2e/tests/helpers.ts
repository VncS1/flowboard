import { randomUUID } from "node:crypto";

import type { Page, WebSocket as PageWebSocket } from "@playwright/test";

export const API_URL = "http://localhost:4000";

export type TestUser = {
  email: string;
  name: string;
  password: string;
};

export function uniqueUser(label: string): TestUser {
  const id = randomUUID().slice(0, 8);
  return {
    email: `${label}-${id}@example.test`,
    name: `${label} ${id}`,
    password: "correct-horse-battery-staple",
  };
}

export async function signupViaUi(page: Page, user: TestUser): Promise<void> {
  await page.goto("/signup");
  await page.getByLabel(/name/i).fill(user.name);
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);
  await page.getByRole("button", { name: /create account/i }).click();
  await page.waitForURL("/boards");
}

export type SeededBoard = {
  boardId: string;
  columns: { id: string; name: string }[];
};

/** Creates a board (with the default Todo/Doing/Done columns) and one card via the
 * REST API directly, using the given (already browser-authenticated) request context.
 * Used to set up multi-context tests without re-testing the creation UI itself. */
export async function seedBoardWithCard(
  request: Page["request"],
  boardName: string,
  cardColumnName: string,
  cardTitle: string,
): Promise<SeededBoard> {
  const boardResponse = await request.post(`${API_URL}/boards`, { data: { name: boardName } });
  const { board } = (await boardResponse.json()) as {
    board: { id: string; columns: { id: string; name: string }[] };
  };

  const column = board.columns.find((c) => c.name === cardColumnName);
  if (!column) {
    throw new Error(`seedBoardWithCard: no column named "${cardColumnName}" on new board`);
  }

  await request.post(`${API_URL}/boards/${board.id}/columns/${column.id}/cards`, {
    data: { title: cardTitle },
  });

  return { boardId: board.id, columns: board.columns };
}

/** Positions the mouse over the card and presses down, arming dnd-kit's drag state.
 * Purely local (no network round trip), so pairing this with {@link dropOnColumn} lets a
 * test stage two drags on separate pages and then fire both drops back-to-back, minimizing
 * the window between the two — needed to make a same-card race actually collide instead of
 * resolving sequentially (see the concurrency test). */
export async function beginDrag(page: Page, cardTitle: string): Promise<void> {
  const card = page.getByText(cardTitle, { exact: true });
  const cardBox = await card.boundingBox();
  if (!cardBox) {
    throw new Error("beginDrag: could not locate the card");
  }

  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
  await page.mouse.down();
}

export async function dropOnColumn(page: Page, targetColumnName: string | RegExp): Promise<void> {
  const targetColumn = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: targetColumnName }) });

  const targetBox = await targetColumn.boundingBox();
  if (!targetBox) {
    throw new Error("dropOnColumn: could not locate the target column");
  }

  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, {
    steps: 10,
  });
  await page.mouse.up();
}

export async function dragCardToColumn(
  page: Page,
  cardTitle: string,
  targetColumnName: string | RegExp,
): Promise<void> {
  await beginDrag(page, cardTitle);
  await dropOnColumn(page, targetColumnName);
}

/** Captures every JSON frame received on the page's board WebSocket connection.
 * Must be called before the page navigates to the board (the socket connects on mount). */
export function captureBoardSocketFrames(page: Page): string[] {
  const frames: string[] = [];
  page.on("websocket", (ws: PageWebSocket) => {
    if (!ws.url().includes("/ws/boards/")) return;
    ws.on("framereceived", (frame) => {
      if (typeof frame.payload === "string") {
        frames.push(frame.payload);
      }
    });
  });
  return frames;
}

/** Navigates to a board and waits until this page's board WebSocket connection has been
 * created (registering the listener before navigating so the "websocket" event can't be
 * missed), plus a short buffer for the server to finish the upgrade/subscribe handshake.
 * Broadcasts are live-only (no replay for late subscribers — see realtime/ws.ts), so a
 * multi-context test must confirm every page is actually subscribed before triggering the
 * action it expects the other page to observe. */
export async function gotoBoardAndWaitForSocket(page: Page, boardId: string): Promise<void> {
  const socketCreated = page.waitForEvent("websocket", {
    predicate: (ws) => ws.url().includes("/ws/boards/"),
  });
  await page.goto(`/boards/${boardId}`);
  await socketCreated;
  await page.waitForTimeout(300);
}
