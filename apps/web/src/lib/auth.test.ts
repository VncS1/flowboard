import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { login, logout, signup } from "./auth";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("login", () => {
  it("posts credentials with credentials: include and returns ok on success", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { user: { id: "1", email: "a@b.com", name: "A" } }),
    );

    const result = await login("a@b.com", "correct-horse");

    expect(result).toEqual({ status: "ok" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ email: "a@b.com", password: "correct-horse" }),
      }),
    );
  });

  it("returns a clear message for invalid credentials", async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { error: "invalid_credentials" }));

    const result = await login("a@b.com", "wrong");

    expect(result).toEqual({ status: "error", message: "Incorrect email or password." });
  });

  it("returns a clear message when the request fails to reach the server", async () => {
    fetchMock.mockRejectedValue(new TypeError("network error"));

    const result = await login("a@b.com", "correct-horse");

    expect(result).toEqual({
      status: "error",
      message: "Could not reach the server. Please try again.",
    });
  });
});

describe("signup", () => {
  it("posts the new account with credentials: include and returns ok on success", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(201, { user: { id: "1", email: "a@b.com", name: "A" } }),
    );

    const result = await signup("a@b.com", "A", "correct-horse");

    expect(result).toEqual({ status: "ok" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/signup",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ email: "a@b.com", name: "A", password: "correct-horse" }),
      }),
    );
  });

  it("returns a clear message when the email is already registered", async () => {
    fetchMock.mockResolvedValue(jsonResponse(409, { error: "email_taken" }));

    const result = await signup("a@b.com", "A", "correct-horse");

    expect(result).toEqual({
      status: "error",
      message: "An account with that email already exists.",
    });
  });

  it("returns a clear message for an invalid signup body", async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { error: "invalid_body", issues: [] }));

    const result = await signup("not-an-email", "A", "short");

    expect(result).toEqual({
      status: "error",
      message: "Please check the information you entered.",
    });
  });
});

describe("logout", () => {
  it("posts to /auth/logout with credentials: include", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));

    await logout();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/logout",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
  });
});
