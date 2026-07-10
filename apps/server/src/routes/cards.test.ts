import type { ServerToClientMessage } from "@flowboard/shared";
import { describe, expect, it } from "vitest";
import type { WebSocket } from "ws";

import { buildApp } from "../app.js";

function nextMessage(socket: WebSocket): Promise<ServerToClientMessage> {
  return new Promise((resolve) => {
    socket.once("message", (data: Buffer) => {
      resolve(JSON.parse(data.toString()) as ServerToClientMessage);
    });
  });
}

async function signup(app: ReturnType<typeof buildApp>, email: string) {
  const response = await app.inject({
    method: "POST",
    url: "/auth/signup",
    payload: { email, name: "Test User", password: "correct-horse" },
  });
  const token = response.cookies.find((cookie) => cookie.name === "token")!.value;
  return { token, userId: response.json().user.id as string };
}

async function createBoard(app: ReturnType<typeof buildApp>, token: string, name: string) {
  const response = await app.inject({
    method: "POST",
    url: "/boards",
    cookies: { token },
    payload: { name },
  });
  return response.json().board as {
    id: string;
    columns: { id: string; name: string }[];
  };
}

async function inviteMember(
  app: ReturnType<typeof buildApp>,
  ownerToken: string,
  boardId: string,
  email: string,
) {
  await app.inject({
    method: "POST",
    url: `/boards/${boardId}/members`,
    cookies: { token: ownerToken },
    payload: { email },
  });
}

describe("POST /boards/:boardId/columns/:columnId/cards", () => {
  it("requires authentication", async () => {
    const app = buildApp();
    const owner = await signup(app, "cardowner1@example.com");
    const board = await createBoard(app, owner.token, "Board");

    const response = await app.inject({
      method: "POST",
      url: `/boards/${board.id}/columns/${board.columns[0]!.id}/cards`,
      payload: { title: "First card" },
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });

  it("creates a card at the end of the column", async () => {
    const app = buildApp();
    const owner = await signup(app, "cardowner2@example.com");
    const board = await createBoard(app, owner.token, "Board");
    const columnId = board.columns[0]!.id;

    const first = await app.inject({
      method: "POST",
      url: `/boards/${board.id}/columns/${columnId}/cards`,
      cookies: { token: owner.token },
      payload: { title: "First card" },
    });
    const second = await app.inject({
      method: "POST",
      url: `/boards/${board.id}/columns/${columnId}/cards`,
      cookies: { token: owner.token },
      payload: { title: "Second card" },
    });

    expect(first.statusCode).toBe(201);
    expect(first.json().card).toMatchObject({ title: "First card", position: 0, version: 1 });
    expect(second.statusCode).toBe(201);
    expect(second.json().card).toMatchObject({ title: "Second card", position: 1 });

    await app.close();
  });

  it("returns 404 for a board owned by someone else", async () => {
    const app = buildApp();
    const owner = await signup(app, "cardowner3@example.com");
    const stranger = await signup(app, "cardstranger1@example.com");
    const board = await createBoard(app, owner.token, "Board");

    const response = await app.inject({
      method: "POST",
      url: `/boards/${board.id}/columns/${board.columns[0]!.id}/cards`,
      cookies: { token: stranger.token },
      payload: { title: "Sneaky card" },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it("lets an invited member create a card", async () => {
    const app = buildApp();
    const owner = await signup(app, "cardowner8@example.com");
    const member = await signup(app, "cardmember1@example.com");
    const board = await createBoard(app, owner.token, "Board");
    await inviteMember(app, owner.token, board.id, "cardmember1@example.com");

    const response = await app.inject({
      method: "POST",
      url: `/boards/${board.id}/columns/${board.columns[0]!.id}/cards`,
      cookies: { token: member.token },
      payload: { title: "Member card" },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().card).toMatchObject({ title: "Member card" });

    await app.close();
  });
});

async function createCard(
  app: ReturnType<typeof buildApp>,
  token: string,
  boardId: string,
  columnId: string,
  title: string,
) {
  const response = await app.inject({
    method: "POST",
    url: `/boards/${boardId}/columns/${columnId}/cards`,
    cookies: { token },
    payload: { title },
  });
  return response.json().card as { id: string; title: string };
}

describe("PATCH /cards/:id", () => {
  it("renames the card for the board owner", async () => {
    const app = buildApp();
    const owner = await signup(app, "cardowner4@example.com");
    const board = await createBoard(app, owner.token, "Board");
    const card = await createCard(app, owner.token, board.id, board.columns[0]!.id, "Old title");

    const response = await app.inject({
      method: "PATCH",
      url: `/cards/${card.id}`,
      cookies: { token: owner.token },
      payload: { title: "New title" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().card).toMatchObject({ title: "New title" });

    await app.close();
  });

  it("returns 404 when renaming a card on someone else's board", async () => {
    const app = buildApp();
    const owner = await signup(app, "cardowner5@example.com");
    const stranger = await signup(app, "cardstranger2@example.com");
    const board = await createBoard(app, owner.token, "Board");
    const card = await createCard(app, owner.token, board.id, board.columns[0]!.id, "Old title");

    const response = await app.inject({
      method: "PATCH",
      url: `/cards/${card.id}`,
      cookies: { token: stranger.token },
      payload: { title: "Hijacked" },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it("lets an invited member rename a card", async () => {
    const app = buildApp();
    const owner = await signup(app, "cardowner9@example.com");
    const member = await signup(app, "cardmember2@example.com");
    const board = await createBoard(app, owner.token, "Board");
    await inviteMember(app, owner.token, board.id, "cardmember2@example.com");
    const card = await createCard(app, owner.token, board.id, board.columns[0]!.id, "Old title");

    const response = await app.inject({
      method: "PATCH",
      url: `/cards/${card.id}`,
      cookies: { token: member.token },
      payload: { title: "Renamed by member" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().card).toMatchObject({ title: "Renamed by member" });

    await app.close();
  });
});

describe("DELETE /cards/:id", () => {
  it("deletes the card for the board owner", async () => {
    const app = buildApp();
    const owner = await signup(app, "cardowner6@example.com");
    const board = await createBoard(app, owner.token, "Board");
    const card = await createCard(app, owner.token, board.id, board.columns[0]!.id, "Doomed");

    const response = await app.inject({
      method: "DELETE",
      url: `/cards/${card.id}`,
      cookies: { token: owner.token },
    });

    expect(response.statusCode).toBe(204);

    await app.close();
  });

  it("returns 404 when deleting a card on someone else's board", async () => {
    const app = buildApp();
    const owner = await signup(app, "cardowner7@example.com");
    const stranger = await signup(app, "cardstranger3@example.com");
    const board = await createBoard(app, owner.token, "Board");
    const card = await createCard(app, owner.token, board.id, board.columns[0]!.id, "Safe");

    const response = await app.inject({
      method: "DELETE",
      url: `/cards/${card.id}`,
      cookies: { token: stranger.token },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it("lets an invited member delete a card", async () => {
    const app = buildApp();
    const owner = await signup(app, "cardowner10@example.com");
    const member = await signup(app, "cardmember3@example.com");
    const board = await createBoard(app, owner.token, "Board");
    await inviteMember(app, owner.token, board.id, "cardmember3@example.com");
    const card = await createCard(app, owner.token, board.id, board.columns[0]!.id, "Doomed");

    const response = await app.inject({
      method: "DELETE",
      url: `/cards/${card.id}`,
      cookies: { token: member.token },
    });

    expect(response.statusCode).toBe(204);

    await app.close();
  });
});

describe("real-time broadcast on card mutations", () => {
  it("broadcasts board:sync to subscribed sockets when a card is created via REST", async () => {
    const app = buildApp();
    await app.ready();
    const owner = await signup(app, "cardbroadcast1@example.com");
    const board = await createBoard(app, owner.token, "Board");
    const columnId = board.columns[0]!.id;

    const socket = await app.injectWS(`/ws/boards/${board.id}`, {
      headers: { cookie: `token=${owner.token}` },
    });

    const synced = nextMessage(socket);
    const response = await app.inject({
      method: "POST",
      url: `/boards/${board.id}/columns/${columnId}/cards`,
      cookies: { token: owner.token },
      payload: { title: "New card" },
    });
    const created = response.json().card as { id: string };

    const message = await synced;
    expect(message).toMatchObject({
      type: "board:sync",
      cards: [expect.objectContaining({ id: created.id, title: "New card" })],
    });

    socket.terminate();
    await app.close();
  });

  it("broadcasts board:sync to subscribed sockets when a card is renamed via REST", async () => {
    const app = buildApp();
    await app.ready();
    const owner = await signup(app, "cardbroadcast2@example.com");
    const board = await createBoard(app, owner.token, "Board");
    const card = await createCard(app, owner.token, board.id, board.columns[0]!.id, "Old title");

    const socket = await app.injectWS(`/ws/boards/${board.id}`, {
      headers: { cookie: `token=${owner.token}` },
    });

    const synced = nextMessage(socket);
    await app.inject({
      method: "PATCH",
      url: `/cards/${card.id}`,
      cookies: { token: owner.token },
      payload: { title: "New title" },
    });

    const message = await synced;
    expect(message).toMatchObject({
      type: "board:sync",
      cards: [expect.objectContaining({ id: card.id, title: "New title" })],
    });

    socket.terminate();
    await app.close();
  });

  it("broadcasts board:sync to subscribed sockets when a card is deleted via REST", async () => {
    const app = buildApp();
    await app.ready();
    const owner = await signup(app, "cardbroadcast3@example.com");
    const board = await createBoard(app, owner.token, "Board");
    const card = await createCard(app, owner.token, board.id, board.columns[0]!.id, "Doomed");

    const socket = await app.injectWS(`/ws/boards/${board.id}`, {
      headers: { cookie: `token=${owner.token}` },
    });

    const synced = nextMessage(socket);
    await app.inject({
      method: "DELETE",
      url: `/cards/${card.id}`,
      cookies: { token: owner.token },
    });

    const message = await synced;
    expect(message).toMatchObject({ type: "board:sync", cards: [] });

    socket.terminate();
    await app.close();
  });
});
