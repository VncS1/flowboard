import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FakeWebSocket } from "@/lib/testUtils/fakeWebSocket";

import { useBoardSocket, type BoardSocketHandlers } from "./useBoardSocket";

function ticketResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function noopHandlers(): BoardSocketHandlers {
  return { onSync: vi.fn(), onConflict: vi.fn(), onBoardDeleted: vi.fn() };
}

async function setup(boardId: string, handlers: BoardSocketHandlers) {
  const utils = renderHook(() => useBoardSocket(boardId, handlers));
  await act(async () => {});
  return utils;
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ticketResponse(200, { ticket: "test-ticket" })));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("useBoardSocket", () => {
  it("fetches a ws ticket from /api/auth/ws-ticket before connecting", async () => {
    await setup("board-1", noopHandlers());

    expect(fetch).toHaveBeenCalledWith("/api/auth/ws-ticket", { credentials: "include" });
  });

  it("connects to NEXT_PUBLIC_WS_URL with the fetched ticket for the given board", async () => {
    vi.stubEnv("NEXT_PUBLIC_WS_URL", "ws://example.test");

    await setup("board-1", noopHandlers());

    expect(FakeWebSocket.latest().url).toBe(
      "ws://example.test/ws/boards/board-1?ticket=test-ticket",
    );
  });

  it("falls back to a local default when NEXT_PUBLIC_WS_URL is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_WS_URL", "");

    await setup("board-1", noopHandlers());

    expect(FakeWebSocket.latest().url).toBe(
      "ws://localhost:4000/ws/boards/board-1?ticket=test-ticket",
    );
  });

  it("does not open a socket when the ticket fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(ticketResponse(401, { error: "unauthorized" })),
    );

    await setup("board-1", noopHandlers());

    expect(FakeWebSocket.instances).toHaveLength(0);
  });

  it("parses a valid board:sync message and forwards it to onSync", async () => {
    const onSync = vi.fn();
    await setup("board-1", { onSync, onConflict: vi.fn(), onBoardDeleted: vi.fn() });

    const message = {
      type: "board:sync",
      board: { id: "board-1", name: "Board", ownerId: "u1" },
      columns: [],
      cards: [],
    };

    act(() => FakeWebSocket.latest().emitMessage(message));

    expect(onSync).toHaveBeenCalledWith(message);
  });

  it("parses a valid card:conflict message and forwards it to onConflict", async () => {
    const onConflict = vi.fn();
    await setup("board-1", { onSync: vi.fn(), onConflict, onBoardDeleted: vi.fn() });

    const message = {
      type: "card:conflict",
      cardId: "card-1",
      reason: "stale-version",
      card: {
        id: "card-1",
        boardId: "board-1",
        columnId: "c1",
        title: "T",
        position: 0,
        version: 2,
      },
    };

    act(() => FakeWebSocket.latest().emitMessage(message));

    expect(onConflict).toHaveBeenCalledWith(message);
  });

  it("parses a valid board:deleted message and forwards it to onBoardDeleted", async () => {
    const onBoardDeleted = vi.fn();
    await setup("board-1", { onSync: vi.fn(), onConflict: vi.fn(), onBoardDeleted });

    const message = { type: "board:deleted", boardId: "board-1" };

    act(() => FakeWebSocket.latest().emitMessage(message));

    expect(onBoardDeleted).toHaveBeenCalledWith(message);
  });

  it("rejects a message that fails schema validation without calling either handler", async () => {
    const onSync = vi.fn();
    const onConflict = vi.fn();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await setup("board-1", { onSync, onConflict, onBoardDeleted: vi.fn() });

    act(() => FakeWebSocket.latest().emitMessage({ type: "not-a-real-message" }));

    expect(onSync).not.toHaveBeenCalled();
    expect(onConflict).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it("rejects a non-JSON message without throwing", async () => {
    const onSync = vi.fn();
    const onConflict = vi.fn();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await setup("board-1", { onSync, onConflict, onBoardDeleted: vi.fn() });

    expect(() => act(() => FakeWebSocket.latest().emitRaw("{not json"))).not.toThrow();

    expect(onSync).not.toHaveBeenCalled();
    expect(onConflict).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it("sends a card:move message over the socket as JSON once the connection is open", async () => {
    const { result } = await setup("board-1", noopHandlers());
    act(() => FakeWebSocket.latest().emitOpen());

    act(() => {
      result.current.send({
        type: "card:move",
        cardId: "card-1",
        toColumnId: "c2",
        toPosition: 0,
        version: 1,
      });
    });

    expect(JSON.parse(FakeWebSocket.latest().sent[0])).toEqual({
      type: "card:move",
      cardId: "card-1",
      toColumnId: "c2",
      toPosition: 0,
      version: 1,
    });
  });

  it("queues a send made before the connection opens and flushes it once open", async () => {
    const { result } = await setup("board-1", noopHandlers());

    act(() => {
      result.current.send({
        type: "card:move",
        cardId: "card-1",
        toColumnId: "c2",
        toPosition: 0,
        version: 1,
      });
    });

    expect(FakeWebSocket.latest().sent).toHaveLength(0);

    act(() => FakeWebSocket.latest().emitOpen());

    expect(JSON.parse(FakeWebSocket.latest().sent[0])).toEqual({
      type: "card:move",
      cardId: "card-1",
      toColumnId: "c2",
      toPosition: 0,
      version: 1,
    });
  });

  it("closes the socket on unmount", async () => {
    const { unmount } = await setup("board-1", noopHandlers());

    unmount();

    expect(FakeWebSocket.latest().closed).toBe(true);
  });
});
