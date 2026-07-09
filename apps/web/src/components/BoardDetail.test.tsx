import { act, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FakeWebSocket } from "@/lib/testUtils/fakeWebSocket";

const { capturedHandlers } = vi.hoisted(() => ({
  capturedHandlers: { onDragEnd: undefined as ((event: unknown) => void) | undefined },
}));

vi.mock("@dnd-kit/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dnd-kit/core")>();
  return {
    ...actual,
    DndContext: ({
      children,
      onDragEnd,
    }: {
      children: ReactNode;
      onDragEnd: (event: unknown) => void;
    }) => {
      capturedHandlers.onDragEnd = onDragEnd;
      return children;
    },
    useDraggable: () => ({
      attributes: {},
      listeners: {},
      setNodeRef: () => {},
      transform: null,
      isDragging: false,
    }),
    useDroppable: () => ({ setNodeRef: () => {}, isOver: false }),
  };
});

const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

import { BoardDetail } from "./BoardDetail";

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
        {
          id: "card2",
          boardId: "1",
          columnId: "c1",
          title: "Ship feature",
          position: 1,
          version: 1,
        },
      ],
    },
    {
      id: "c2",
      boardId: "1",
      name: "Done",
      position: 1,
      cards: [],
    },
  ],
};

describe("BoardDetail", () => {
  beforeEach(() => {
    mockRefresh.mockClear();
    capturedHandlers.onDragEnd = undefined;
  });

  it("renders the board name as the page heading", () => {
    render(<BoardDetail board={board} />);

    expect(screen.getByRole("heading", { level: 1, name: /sprint board/i })).toBeInTheDocument();
  });

  it("renders each column with its cards", () => {
    render(<BoardDetail board={board} />);

    const todoColumn = screen.getByRole("heading", { name: /todo/i }).closest("section")!;
    expect(within(todoColumn).getByText("Write tests")).toBeInTheDocument();
    expect(within(todoColumn).getByText("Ship feature")).toBeInTheDocument();
  });

  it("shows an empty state for a column with no cards", () => {
    render(<BoardDetail board={board} />);

    const doneColumn = screen.getByRole("heading", { name: /done/i }).closest("section")!;
    expect(within(doneColumn).getByText(/no cards/i)).toBeInTheDocument();
  });

  it("optimistically moves a card to the target column immediately and emits card:move", () => {
    render(<BoardDetail board={board} />);

    act(() => {
      capturedHandlers.onDragEnd?.({ active: { id: "card1" }, over: { id: "c2" } });
    });

    const doneColumn = screen.getByRole("heading", { name: /done/i }).closest("section")!;
    expect(within(doneColumn).getByText("Write tests")).toBeInTheDocument();

    const todoColumn = screen.getByRole("heading", { name: /todo/i }).closest("section")!;
    expect(within(todoColumn).queryByText("Write tests")).not.toBeInTheDocument();

    const sent = FakeWebSocket.latest().sent;
    expect(sent).toHaveLength(1);
    expect(JSON.parse(sent[0])).toMatchObject({
      type: "card:move",
      cardId: "card1",
      toColumnId: "c2",
      toPosition: 0,
      version: 1,
    });
  });

  it("rolls back the optimistic move and refetches when the server reports a conflict", () => {
    render(<BoardDetail board={board} />);

    act(() => {
      capturedHandlers.onDragEnd?.({ active: { id: "card1" }, over: { id: "c2" } });
    });

    const doneColumnDuringOptimism = screen
      .getByRole("heading", { name: /done/i })
      .closest("section")!;
    expect(within(doneColumnDuringOptimism).getByText("Write tests")).toBeInTheDocument();

    act(() => {
      FakeWebSocket.latest().emitMessage({
        type: "card:conflict",
        cardId: "card1",
        reason: "stale-version",
        card: {
          id: "card1",
          boardId: "1",
          columnId: "c1",
          title: "Write tests",
          position: 0,
          version: 2,
        },
      });
    });

    const todoColumn = screen.getByRole("heading", { name: /todo/i }).closest("section")!;
    expect(within(todoColumn).getByText("Write tests")).toBeInTheDocument();

    const doneColumnAfterRollback = screen
      .getByRole("heading", { name: /done/i })
      .closest("section")!;
    expect(within(doneColumnAfterRollback).queryByText("Write tests")).not.toBeInTheDocument();

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("applies a board:sync event from another client live, without a refresh", () => {
    render(<BoardDetail board={board} />);

    act(() => {
      FakeWebSocket.latest().emitMessage({
        type: "board:sync",
        board: { id: "1", name: "Sprint Board", ownerId: "u1" },
        columns: [
          { id: "c1", boardId: "1", name: "Todo", position: 0 },
          { id: "c2", boardId: "1", name: "Done", position: 1 },
        ],
        cards: [
          {
            id: "card1",
            boardId: "1",
            columnId: "c2",
            title: "Write tests",
            position: 0,
            version: 2,
          },
          {
            id: "card2",
            boardId: "1",
            columnId: "c1",
            title: "Ship feature",
            position: 0,
            version: 1,
          },
        ],
      });
    });

    const doneColumn = screen.getByRole("heading", { name: /done/i }).closest("section")!;
    expect(within(doneColumn).getByText("Write tests")).toBeInTheDocument();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("rejects an inbound message that fails schema validation without applying it", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<BoardDetail board={board} />);

    act(() => {
      FakeWebSocket.latest().emitMessage({ type: "card:move", cardId: "card1" });
    });

    expect(errorSpy).toHaveBeenCalled();
    const todoColumn = screen.getByRole("heading", { name: /todo/i }).closest("section")!;
    expect(within(todoColumn).getByText("Write tests")).toBeInTheDocument();

    errorSpy.mockRestore();
  });
});
