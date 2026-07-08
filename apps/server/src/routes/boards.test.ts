import { describe, expect, it } from "vitest";

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

describe("POST /boards", () => {
  it("requires authentication", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/boards",
      payload: { name: "My Board" },
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });

  it("creates a board with default Todo/Doing/Done columns", async () => {
    const app = buildApp();
    const { token } = await signup(app, "owner@example.com");

    const response = await app.inject({
      method: "POST",
      url: "/boards",
      cookies: { token },
      payload: { name: "My Board" },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.board).toMatchObject({ name: "My Board" });
    expect(body.board.columns.map((column: { name: string }) => column.name)).toEqual([
      "Todo",
      "Doing",
      "Done",
    ]);

    await app.close();
  });
});

async function createBoard(app: ReturnType<typeof buildApp>, token: string, name: string) {
  const response = await app.inject({
    method: "POST",
    url: "/boards",
    cookies: { token },
    payload: { name },
  });
  return response.json().board as { id: string; name: string };
}

describe("GET /boards", () => {
  it("lists only boards owned by the authenticated user", async () => {
    const app = buildApp();
    const owner = await signup(app, "lister@example.com");
    const other = await signup(app, "other@example.com");
    await createBoard(app, owner.token, "Owner Board");
    await createBoard(app, other.token, "Other Board");

    const response = await app.inject({
      method: "GET",
      url: "/boards",
      cookies: { token: owner.token },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.boards).toHaveLength(1);
    expect(body.boards[0]).toMatchObject({ name: "Owner Board" });

    await app.close();
  });
});

describe("GET /boards/:id", () => {
  it("returns the board for its owner", async () => {
    const app = buildApp();
    const owner = await signup(app, "getter@example.com");
    const board = await createBoard(app, owner.token, "Detail Board");

    const response = await app.inject({
      method: "GET",
      url: `/boards/${board.id}`,
      cookies: { token: owner.token },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().board).toMatchObject({ name: "Detail Board" });

    await app.close();
  });

  it("returns 404 for a board owned by someone else", async () => {
    const app = buildApp();
    const owner = await signup(app, "owner2@example.com");
    const stranger = await signup(app, "stranger@example.com");
    const board = await createBoard(app, owner.token, "Private Board");

    const response = await app.inject({
      method: "GET",
      url: `/boards/${board.id}`,
      cookies: { token: stranger.token },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });
});

describe("PATCH /boards/:id", () => {
  it("renames the board for its owner", async () => {
    const app = buildApp();
    const owner = await signup(app, "renamer@example.com");
    const board = await createBoard(app, owner.token, "Old Name");

    const response = await app.inject({
      method: "PATCH",
      url: `/boards/${board.id}`,
      cookies: { token: owner.token },
      payload: { name: "New Name" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().board).toMatchObject({ name: "New Name" });

    await app.close();
  });

  it("returns 404 when renaming someone else's board", async () => {
    const app = buildApp();
    const owner = await signup(app, "owner3@example.com");
    const stranger = await signup(app, "stranger2@example.com");
    const board = await createBoard(app, owner.token, "Guarded Board");

    const response = await app.inject({
      method: "PATCH",
      url: `/boards/${board.id}`,
      cookies: { token: stranger.token },
      payload: { name: "Hijacked" },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });
});

describe("DELETE /boards/:id", () => {
  it("deletes the board for its owner", async () => {
    const app = buildApp();
    const owner = await signup(app, "deleter@example.com");
    const board = await createBoard(app, owner.token, "Doomed Board");

    const response = await app.inject({
      method: "DELETE",
      url: `/boards/${board.id}`,
      cookies: { token: owner.token },
    });

    expect(response.statusCode).toBe(204);

    const getResponse = await app.inject({
      method: "GET",
      url: `/boards/${board.id}`,
      cookies: { token: owner.token },
    });
    expect(getResponse.statusCode).toBe(404);

    await app.close();
  });

  it("returns 404 when deleting someone else's board", async () => {
    const app = buildApp();
    const owner = await signup(app, "owner4@example.com");
    const stranger = await signup(app, "stranger3@example.com");
    const board = await createBoard(app, owner.token, "Safe Board");

    const response = await app.inject({
      method: "DELETE",
      url: `/boards/${board.id}`,
      cookies: { token: stranger.token },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });
});
