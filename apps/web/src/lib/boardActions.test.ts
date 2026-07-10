import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createBoard,
  createCard,
  deleteBoard,
  deleteCard,
  renameBoard,
  updateCard,
} from "./boardActions";

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

describe("createBoard", () => {
  it("posts the board name with credentials: include and returns the created board", async () => {
    const board = { id: "b1", name: "Sprint Board", ownerId: "u1" };
    fetchMock.mockResolvedValue(jsonResponse(201, { board }));

    const result = await createBoard("Sprint Board");

    expect(result).toEqual({ status: "ok", board });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/boards"),
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ name: "Sprint Board" }),
      }),
    );
  });

  it("returns a clear message for an invalid name", async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { error: "invalid_body", issues: [] }));

    const result = await createBoard("");

    expect(result).toEqual({
      status: "error",
      message: "Please check the information you entered.",
    });
  });

  it("returns a clear message when the request fails to reach the server", async () => {
    fetchMock.mockRejectedValue(new TypeError("network error"));

    const result = await createBoard("Sprint Board");

    expect(result).toEqual({
      status: "error",
      message: "Could not reach the server. Please try again.",
    });
  });
});

describe("createCard", () => {
  it("posts the card title with credentials: include and returns the created card", async () => {
    const card = {
      id: "c1",
      boardId: "b1",
      columnId: "col1",
      title: "Write tests",
      position: 0,
      version: 1,
    };
    fetchMock.mockResolvedValue(jsonResponse(201, { card }));

    const result = await createCard("b1", "col1", "Write tests");

    expect(result).toEqual({ status: "ok", card });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/boards/b1/columns/col1/cards"),
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ title: "Write tests" }),
      }),
    );
  });

  it("returns a clear message for an invalid title", async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { error: "invalid_body", issues: [] }));

    const result = await createCard("b1", "col1", "");

    expect(result).toEqual({
      status: "error",
      message: "Please check the information you entered.",
    });
  });

  it("returns a clear message when the column no longer exists", async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { error: "not_found" }));

    const result = await createCard("b1", "missing-column", "Write tests");

    expect(result).toEqual({
      status: "error",
      message: "This column no longer exists. Please refresh and try again.",
    });
  });
});

describe("renameBoard", () => {
  it("patches the board name with credentials: include and returns the renamed board", async () => {
    const board = { id: "b1", name: "New Name", ownerId: "u1" };
    fetchMock.mockResolvedValue(jsonResponse(200, { board }));

    const result = await renameBoard("b1", "New Name");

    expect(result).toEqual({ status: "ok", board });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/boards/b1"),
      expect.objectContaining({
        method: "PATCH",
        credentials: "include",
        body: JSON.stringify({ name: "New Name" }),
      }),
    );
  });

  it("returns a clear message when a non-owner tries to rename", async () => {
    fetchMock.mockResolvedValue(jsonResponse(403, { error: "owner_only" }));

    const result = await renameBoard("b1", "New Name");

    expect(result).toEqual({
      status: "error",
      message: "Only the board owner can do this.",
    });
  });
});

describe("deleteBoard", () => {
  it("sends a DELETE request with credentials: include", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    const result = await deleteBoard("b1");

    expect(result).toEqual({ status: "ok" });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/boards/b1"),
      expect.objectContaining({ method: "DELETE", credentials: "include" }),
    );
  });

  it("returns a clear message when a non-owner tries to delete", async () => {
    fetchMock.mockResolvedValue(jsonResponse(403, { error: "owner_only" }));

    const result = await deleteBoard("b1");

    expect(result).toEqual({
      status: "error",
      message: "Only the board owner can do this.",
    });
  });
});

describe("updateCard", () => {
  it("patches the card fields with credentials: include and returns the updated card", async () => {
    const card = {
      id: "c1",
      boardId: "b1",
      columnId: "col1",
      title: "Updated title",
      position: 0,
      version: 2,
    };
    fetchMock.mockResolvedValue(jsonResponse(200, { card }));

    const result = await updateCard("c1", { title: "Updated title" });

    expect(result).toEqual({ status: "ok", card });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/cards/c1"),
      expect.objectContaining({
        method: "PATCH",
        credentials: "include",
        body: JSON.stringify({ title: "Updated title" }),
      }),
    );
  });

  it("returns a clear message for an invalid title", async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { error: "invalid_body", issues: [] }));

    const result = await updateCard("c1", { title: "" });

    expect(result).toEqual({
      status: "error",
      message: "Please check the information you entered.",
    });
  });
});

describe("deleteCard", () => {
  it("sends a DELETE request with credentials: include", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    const result = await deleteCard("c1");

    expect(result).toEqual({ status: "ok" });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/cards/c1"),
      expect.objectContaining({ method: "DELETE", credentials: "include" }),
    );
  });
});
