import { afterEach, describe, expect, it, vi } from "vitest";

const { cookiesMock } = vi.hoisted(() => ({ cookiesMock: vi.fn() }));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("getBoards", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("forwards the auth cookie and returns boards on success", async () => {
    cookiesMock.mockResolvedValue({
      get: (name: string) => (name === "token" ? { value: "abc" } : undefined),
    });
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        boards: [{ id: "1", name: "Sprint Board", ownerId: "u1", columns: [] }],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { getBoards } = await import("./api");
    const result = await getBoards();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/boards"),
      expect.objectContaining({ headers: { cookie: "token=abc" } }),
    );
    expect(result).toEqual({
      status: "ok",
      boards: [{ id: "1", name: "Sprint Board", ownerId: "u1", columns: [] }],
    });
  });

  it("returns an unauthenticated result on a 401 response", async () => {
    cookiesMock.mockResolvedValue({ get: () => undefined });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401, { error: "unauthorized" })));

    const { getBoards } = await import("./api");
    const result = await getBoards();

    expect(result).toEqual({ status: "unauthenticated" });
  });
});

describe("getBoard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("returns the board with nested columns and cards on success", async () => {
    cookiesMock.mockResolvedValue({
      get: (name: string) => (name === "token" ? { value: "abc" } : undefined),
    });
    const board = {
      id: "1",
      name: "Sprint Board",
      ownerId: "u1",
      columns: [
        {
          id: "c1",
          boardId: "1",
          name: "Todo",
          position: 0,
          cards: [
            {
              id: "card1",
              boardId: "1",
              columnId: "c1",
              title: "Write tests",
              position: 0,
              version: 1,
            },
          ],
        },
      ],
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, { board })));

    const { getBoard } = await import("./api");
    const result = await getBoard("1");

    expect(result).toEqual({ status: "ok", board });
  });

  it("returns a not-found result on a 404 response", async () => {
    cookiesMock.mockResolvedValue({ get: () => undefined });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(404, { error: "not_found" })));

    const { getBoard } = await import("./api");
    const result = await getBoard("missing");

    expect(result).toEqual({ status: "not-found" });
  });
});

describe("getCurrentUser", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("forwards the auth cookie and returns the signed-in user on success", async () => {
    cookiesMock.mockResolvedValue({
      get: (name: string) => (name === "token" ? { value: "abc" } : undefined),
    });
    const user = { id: "u1", email: "alice@example.com", name: "Alice" };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { user }));
    vi.stubGlobal("fetch", fetchMock);

    const { getCurrentUser } = await import("./api");
    const result = await getCurrentUser();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/auth/me"),
      expect.objectContaining({ headers: { cookie: "token=abc" } }),
    );
    expect(result).toEqual({ status: "ok", user });
  });

  it("returns an unauthenticated result on a 401 response", async () => {
    cookiesMock.mockResolvedValue({ get: () => undefined });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401, { error: "unauthorized" })));

    const { getCurrentUser } = await import("./api");
    const result = await getCurrentUser();

    expect(result).toEqual({ status: "unauthenticated" });
  });
});
