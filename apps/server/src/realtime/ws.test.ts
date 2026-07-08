import type { ServerToClientMessage } from "@flowboard/shared";
import { describe, expect, it } from "vitest";
import type { WebSocket } from "ws";

import { buildApp } from "../app.js";

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
  return response.json().card as { id: string; version: number };
}

function nextMessage(socket: WebSocket): Promise<ServerToClientMessage> {
  return new Promise((resolve) => {
    socket.once("message", (data: Buffer) => {
      resolve(JSON.parse(data.toString()) as ServerToClientMessage);
    });
  });
}

describe("WS /ws/boards/:boardId handshake", () => {
  it("rejects the upgrade when no JWT cookie is present", async () => {
    const app = buildApp();
    await app.ready();
    const owner = await signup(app, "wsauth1@example.com");
    const board = await createBoard(app, owner.token, "Board");

    await expect(app.injectWS(`/ws/boards/${board.id}`)).rejects.toThrow(/401/);

    await app.close();
  });

  it("rejects the upgrade for a board owned by someone else", async () => {
    const app = buildApp();
    await app.ready();
    const owner = await signup(app, "wsauth2@example.com");
    const stranger = await signup(app, "wsauth3@example.com");
    const board = await createBoard(app, owner.token, "Board");

    await expect(
      app.injectWS(`/ws/boards/${board.id}`, { headers: { cookie: `token=${stranger.token}` } }),
    ).rejects.toThrow(/404/);

    await app.close();
  });
});

describe("WS card:move", () => {
  it("broadcasts board:sync to other sockets on a successful move, excluding the sender", async () => {
    const app = buildApp();
    await app.ready();
    const owner = await signup(app, "wsmove1@example.com");
    const board = await createBoard(app, owner.token, "Board");
    const [columnA, columnB] = board.columns;
    const card = await createCard(app, owner.token, board.id, columnA!.id, "Card");

    const path = `/ws/boards/${board.id}`;
    const headers = { cookie: `token=${owner.token}` };
    const senderSocket = await app.injectWS(path, { headers });
    const otherSocket = await app.injectWS(path, { headers });

    const otherMessage = nextMessage(otherSocket);
    senderSocket.send(
      JSON.stringify({
        type: "card:move",
        cardId: card.id,
        toColumnId: columnB!.id,
        toPosition: 0,
        version: card.version,
      }),
    );

    const message = await otherMessage;
    expect(message).toMatchObject({
      type: "board:sync",
      cards: [
        expect.objectContaining({ id: card.id, columnId: columnB!.id, version: card.version + 1 }),
      ],
    });

    senderSocket.terminate();
    otherSocket.terminate();
    await app.close();
  });

  it("sends card:conflict to the socket that moves with a stale version", async () => {
    const app = buildApp();
    await app.ready();
    const owner = await signup(app, "wsmove2@example.com");
    const board = await createBoard(app, owner.token, "Board");
    const [columnA, columnB] = board.columns;
    const card = await createCard(app, owner.token, board.id, columnA!.id, "Card");

    const path = `/ws/boards/${board.id}`;
    const headers = { cookie: `token=${owner.token}` };
    const socket = await app.injectWS(path, { headers });

    const reply = nextMessage(socket);
    socket.send(
      JSON.stringify({
        type: "card:move",
        cardId: card.id,
        toColumnId: columnB!.id,
        toPosition: 0,
        version: card.version + 1,
      }),
    );

    const message = await reply;
    expect(message).toMatchObject({
      type: "card:conflict",
      cardId: card.id,
      reason: "stale-version",
      card: expect.objectContaining({ id: card.id, version: card.version }),
    });

    socket.terminate();
    await app.close();
  });
});
