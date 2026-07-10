import { describe, expect, it } from "vitest";

import { buildApp } from "../app.js";
import { prisma } from "../db/client.js";

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
  return response.json().board as { id: string; name: string };
}

describe("POST /boards/:id/members", () => {
  it("requires authentication", async () => {
    const app = buildApp();
    const owner = await signup(app, "auth-owner@example.com");
    const board = await createBoard(app, owner.token, "Auth Board");

    const response = await app.inject({
      method: "POST",
      url: `/boards/${board.id}/members`,
      payload: { email: "someone@example.com" },
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });

  it("lets the owner invite an existing registered user by email", async () => {
    const app = buildApp();
    const owner = await signup(app, "invite-owner@example.com");
    const invitee = await signup(app, "invitee@example.com");
    const board = await createBoard(app, owner.token, "Team Board");

    const response = await app.inject({
      method: "POST",
      url: `/boards/${board.id}/members`,
      cookies: { token: owner.token },
      payload: { email: "invitee@example.com" },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.member).toMatchObject({
      boardId: board.id,
      userId: invitee.userId,
      role: "MEMBER",
    });

    const stored = await prisma.boardMember.findFirst({
      where: { boardId: board.id, userId: invitee.userId },
    });
    expect(stored).not.toBeNull();
    expect(stored?.role).toBe("MEMBER");

    await app.close();
  });

  it("returns a clear error when the email doesn't match a registered user", async () => {
    const app = buildApp();
    const owner = await signup(app, "no-match-owner@example.com");
    const board = await createBoard(app, owner.token, "Lonely Board");

    const response = await app.inject({
      method: "POST",
      url: `/boards/${board.id}/members`,
      cookies: { token: owner.token },
      payload: { email: "nobody-registered@example.com" },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: "user_not_found" });

    await app.close();
  });

  it("returns 404 when the board doesn't exist or the requester has no access to it", async () => {
    const app = buildApp();
    const stranger = await signup(app, "no-access-stranger@example.com");
    const invitee = await signup(app, "invitee2@example.com");

    const response = await app.inject({
      method: "POST",
      url: `/boards/00000000-0000-0000-0000-000000000000/members`,
      cookies: { token: stranger.token },
      payload: { email: "invitee2@example.com" },
    });

    expect(response.statusCode).toBe(404);
    void invitee;

    await app.close();
  });

  it("rejects a non-owner member trying to invite someone", async () => {
    const app = buildApp();
    const owner = await signup(app, "member-cant-invite-owner@example.com");
    const member = await signup(app, "member-cant-invite-member@example.com");
    const invitee = await signup(app, "member-cant-invite-invitee@example.com");
    const board = await createBoard(app, owner.token, "Guarded Team Board");

    await app.inject({
      method: "POST",
      url: `/boards/${board.id}/members`,
      cookies: { token: owner.token },
      payload: { email: "member-cant-invite-member@example.com" },
    });

    const response = await app.inject({
      method: "POST",
      url: `/boards/${board.id}/members`,
      cookies: { token: member.token },
      payload: { email: "member-cant-invite-invitee@example.com" },
    });

    expect(response.statusCode).toBe(403);
    void invitee;

    await app.close();
  });

  it("returns 409 when the user is already a member", async () => {
    const app = buildApp();
    const owner = await signup(app, "dup-owner@example.com");
    const invitee = await signup(app, "dup-invitee@example.com");
    const board = await createBoard(app, owner.token, "Dup Board");

    await app.inject({
      method: "POST",
      url: `/boards/${board.id}/members`,
      cookies: { token: owner.token },
      payload: { email: "dup-invitee@example.com" },
    });

    const response = await app.inject({
      method: "POST",
      url: `/boards/${board.id}/members`,
      cookies: { token: owner.token },
      payload: { email: "dup-invitee@example.com" },
    });

    expect(response.statusCode).toBe(409);
    void invitee;

    await app.close();
  });
});

describe("DELETE /boards/:id/members/:userId", () => {
  async function inviteMember(
    app: ReturnType<typeof buildApp>,
    ownerToken: string,
    boardId: string,
    email: string,
  ) {
    const response = await app.inject({
      method: "POST",
      url: `/boards/${boardId}/members`,
      cookies: { token: ownerToken },
      payload: { email },
    });
    return response.json().member as { id: string; userId: string };
  }

  it("requires authentication", async () => {
    const app = buildApp();
    const owner = await signup(app, "del-auth-owner@example.com");
    const member = await signup(app, "del-auth-member@example.com");
    const board = await createBoard(app, owner.token, "Del Auth Board");
    await inviteMember(app, owner.token, board.id, "del-auth-member@example.com");

    const response = await app.inject({
      method: "DELETE",
      url: `/boards/${board.id}/members/${member.userId}`,
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });

  it("lets the owner remove a member", async () => {
    const app = buildApp();
    const owner = await signup(app, "del-owner@example.com");
    const member = await signup(app, "del-member@example.com");
    const board = await createBoard(app, owner.token, "Del Board");
    await inviteMember(app, owner.token, board.id, "del-member@example.com");

    const response = await app.inject({
      method: "DELETE",
      url: `/boards/${board.id}/members/${member.userId}`,
      cookies: { token: owner.token },
    });

    expect(response.statusCode).toBe(204);

    const stored = await prisma.boardMember.findFirst({
      where: { boardId: board.id, userId: member.userId },
    });
    expect(stored).toBeNull();

    await app.close();
  });

  it("returns 404 when the board doesn't exist or the requester has no access to it", async () => {
    const app = buildApp();
    const stranger = await signup(app, "del-no-access-stranger@example.com");

    const response = await app.inject({
      method: "DELETE",
      url: `/boards/00000000-0000-0000-0000-000000000000/members/00000000-0000-0000-0000-000000000001`,
      cookies: { token: stranger.token },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it("returns 404 when the target user is not a member of the board", async () => {
    const app = buildApp();
    const owner = await signup(app, "del-nomember-owner@example.com");
    const notMember = await signup(app, "del-nomember-user@example.com");
    const board = await createBoard(app, owner.token, "No Member Board");

    const response = await app.inject({
      method: "DELETE",
      url: `/boards/${board.id}/members/${notMember.userId}`,
      cookies: { token: owner.token },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it("rejects a non-owner member trying to remove another member, including themself", async () => {
    const app = buildApp();
    const owner = await signup(app, "del-member-cant-remove-owner@example.com");
    const memberA = await signup(app, "del-member-cant-remove-a@example.com");
    const memberB = await signup(app, "del-member-cant-remove-b@example.com");
    const board = await createBoard(app, owner.token, "Member Cant Remove Board");
    await inviteMember(app, owner.token, board.id, "del-member-cant-remove-a@example.com");
    await inviteMember(app, owner.token, board.id, "del-member-cant-remove-b@example.com");

    const removeOther = await app.inject({
      method: "DELETE",
      url: `/boards/${board.id}/members/${memberB.userId}`,
      cookies: { token: memberA.token },
    });
    expect(removeOther.statusCode).toBe(403);

    const removeSelf = await app.inject({
      method: "DELETE",
      url: `/boards/${board.id}/members/${memberA.userId}`,
      cookies: { token: memberA.token },
    });
    expect(removeSelf.statusCode).toBe(403);

    await app.close();
  });
});
