import { describe, expect, it } from "vitest";

import { buildApp } from "../app.js";
import { prisma } from "../db/client.js";

describe("POST /auth/signup", () => {
  it("creates a user and sets an auth cookie", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: { email: "alice@example.com", name: "Alice", password: "correct-horse" },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.user).toMatchObject({ email: "alice@example.com", name: "Alice" });
    expect(body.user.passwordHash).toBeUndefined();

    const cookies = response.cookies;
    const tokenCookie = cookies.find((cookie) => cookie.name === "token");
    expect(tokenCookie).toBeDefined();
    expect(tokenCookie?.httpOnly).toBe(true);
    expect(tokenCookie?.sameSite).toBe("Lax");

    const stored = await prisma.user.findUnique({ where: { email: "alice@example.com" } });
    expect(stored).not.toBeNull();
    expect(stored?.passwordHash).not.toBe("correct-horse");

    await app.close();
  });

  it("rejects a duplicate email with 409", async () => {
    const app = buildApp();

    await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: { email: "bob@example.com", name: "Bob", password: "correct-horse" },
    });
    const response = await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: { email: "bob@example.com", name: "Bob Two", password: "another-pass" },
    });

    expect(response.statusCode).toBe(409);

    await app.close();
  });

  it("rejects an invalid body with 400", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: { email: "not-an-email", name: "Nobody", password: "short" },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });
});

describe("POST /auth/login", () => {
  it("logs in with correct credentials and sets an auth cookie", async () => {
    const app = buildApp();
    await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: { email: "carol@example.com", name: "Carol", password: "correct-horse" },
    });

    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "carol@example.com", password: "correct-horse" },
    });

    expect(response.statusCode).toBe(200);
    const tokenCookie = response.cookies.find((cookie) => cookie.name === "token");
    expect(tokenCookie).toBeDefined();

    await app.close();
  });

  it("rejects an unknown email with 401", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "ghost@example.com", password: "whatever1" },
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });

  it("rejects the wrong password with 401", async () => {
    const app = buildApp();
    await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: { email: "dave@example.com", name: "Dave", password: "correct-horse" },
    });

    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "dave@example.com", password: "wrong-password" },
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

describe("GET /auth/me", () => {
  it("returns the signed-in user for a valid session", async () => {
    const app = buildApp();
    const signup = await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: { email: "frank@example.com", name: "Frank", password: "correct-horse" },
    });
    const tokenCookie = signup.cookies.find((cookie) => cookie.name === "token");

    const response = await app.inject({
      method: "GET",
      url: "/auth/me",
      cookies: { token: tokenCookie!.value },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.user).toMatchObject({ email: "frank@example.com", name: "Frank" });
    expect(body.user.passwordHash).toBeUndefined();

    await app.close();
  });

  it("rejects an unauthenticated request with 401", async () => {
    const app = buildApp();

    const response = await app.inject({ method: "GET", url: "/auth/me" });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

describe("POST /auth/logout", () => {
  it("clears the auth cookie", async () => {
    const app = buildApp();
    await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: { email: "erin@example.com", name: "Erin", password: "correct-horse" },
    });

    const response = await app.inject({ method: "POST", url: "/auth/logout" });

    expect(response.statusCode).toBe(200);
    const tokenCookie = response.cookies.find((cookie) => cookie.name === "token");
    expect(tokenCookie).toBeDefined();
    expect(tokenCookie?.value).toBe("");
    expect(Number(tokenCookie?.maxAge)).toBeLessThanOrEqual(0);

    await app.close();
  });
});
