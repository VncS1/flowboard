import { afterEach, describe, expect, it, vi } from "vitest";

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

  it("sends credentials and returns boards on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        boards: [{ id: "1", name: "Sprint Board", ownerId: "u1", columns: [] }],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { getBoards } = await import("./api");
    const result = await getBoards();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/boards",
      expect.objectContaining({ credentials: "include" }),
    );
    expect(result).toEqual({
      status: "ok",
      boards: [{ id: "1", name: "Sprint Board", ownerId: "u1", columns: [] }],
    });
  });

  it("returns an unauthenticated result on a 401 response", async () => {
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

  it("sends credentials and returns the board with nested columns and cards on success", async () => {
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
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { board }));
    vi.stubGlobal("fetch", fetchMock);

    const { getBoard } = await import("./api");
    const result = await getBoard("1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/boards/1",
      expect.objectContaining({ credentials: "include" }),
    );
    expect(result).toEqual({ status: "ok", board });
  });

  it("returns a not-found result on a 404 response", async () => {
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

  it("sends credentials and returns the signed-in user on success", async () => {
    const user = { id: "u1", email: "alice@example.com", name: "Alice" };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { user }));
    vi.stubGlobal("fetch", fetchMock);

    const { getCurrentUser } = await import("./api");
    const result = await getCurrentUser();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/me",
      expect.objectContaining({ credentials: "include" }),
    );
    expect(result).toEqual({ status: "ok", user });
  });

  it("returns an unauthenticated result on a 401 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401, { error: "unauthorized" })));

    const { getCurrentUser } = await import("./api");
    const result = await getCurrentUser();

    expect(result).toEqual({ status: "unauthenticated" });
  });
});
