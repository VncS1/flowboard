import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FakeWebSocket } from "@/lib/testUtils/fakeWebSocket";

const mockCreateCard = vi.fn();
const mockRenameBoard = vi.fn();
const mockDeleteBoard = vi.fn();
const mockUpdateCard = vi.fn();
const mockDeleteCard = vi.fn();
const mockInviteMember = vi.fn();
const mockRemoveMember = vi.fn();
vi.mock("@/lib/boardActions", () => ({
  createCard: (...args: unknown[]) => mockCreateCard(...args),
  renameBoard: (...args: unknown[]) => mockRenameBoard(...args),
  deleteBoard: (...args: unknown[]) => mockDeleteBoard(...args),
  updateCard: (...args: unknown[]) => mockUpdateCard(...args),
  deleteCard: (...args: unknown[]) => mockDeleteCard(...args),
  inviteMember: (...args: unknown[]) => mockInviteMember(...args),
  removeMember: (...args: unknown[]) => mockRemoveMember(...args),
}));

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
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh, push: mockPush }),
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
  members: [{ id: "u1", name: "Board Owner", email: "owner@example.com", role: "OWNER" as const }],
};

describe("BoardDetail", () => {
  beforeEach(() => {
    mockRefresh.mockClear();
    mockPush.mockClear();
    mockCreateCard.mockReset();
    mockRenameBoard.mockReset();
    mockDeleteBoard.mockReset();
    mockUpdateCard.mockReset();
    mockDeleteCard.mockReset();
    mockInviteMember.mockReset();
    mockRemoveMember.mockReset();
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
    act(() => FakeWebSocket.latest().emitOpen());

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

  it("sends the incremented version for a second move of the same card in the same tab, with no server round trip in between", () => {
    render(<BoardDetail board={board} />);
    act(() => FakeWebSocket.latest().emitOpen());

    act(() => {
      capturedHandlers.onDragEnd?.({ active: { id: "card1" }, over: { id: "c2" } });
    });
    act(() => {
      capturedHandlers.onDragEnd?.({ active: { id: "card1" }, over: { id: "c1" } });
    });

    const sent = FakeWebSocket.latest().sent;
    expect(sent).toHaveLength(2);
    expect(JSON.parse(sent[1])).toMatchObject({
      type: "card:move",
      cardId: "card1",
      toColumnId: "c1",
      version: 2,
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

  it("adds a new card to the column immediately after a successful submit", async () => {
    mockCreateCard.mockResolvedValue({
      status: "ok",
      card: {
        id: "card3",
        boardId: "1",
        columnId: "c2",
        title: "New task",
        position: 0,
        version: 1,
      },
    });
    const user = userEvent.setup();
    render(<BoardDetail board={board} />);

    const doneColumn = screen.getByRole("heading", { name: /done/i }).closest("section")!;
    await user.type(within(doneColumn).getByLabelText(/new card title/i), "New task");
    await user.click(within(doneColumn).getByRole("button", { name: /add card/i }));

    await waitFor(() => expect(mockCreateCard).toHaveBeenCalledWith("1", "c2", "New task"));
    expect(within(doneColumn).getByText("New task")).toBeInTheDocument();
  });

  it("shows a clear error message when creating a card fails", async () => {
    mockCreateCard.mockResolvedValue({
      status: "error",
      message: "Could not create the card. Please try again.",
    });
    const user = userEvent.setup();
    render(<BoardDetail board={board} />);

    const doneColumn = screen.getByRole("heading", { name: /done/i }).closest("section")!;
    await user.type(within(doneColumn).getByLabelText(/new card title/i), "New task");
    await user.click(within(doneColumn).getByRole("button", { name: /add card/i }));

    expect(await within(doneColumn).findByRole("alert")).toHaveTextContent(
      "Could not create the card. Please try again.",
    );
  });

  describe("board rename (owner only)", () => {
    it("shows a rename control for the board owner", () => {
      render(<BoardDetail board={board} currentUserId="u1" />);

      expect(screen.getByRole("button", { name: /rename/i })).toBeInTheDocument();
    });

    it("hides the rename control for a non-owner member", () => {
      render(<BoardDetail board={board} currentUserId="u2" />);

      expect(screen.queryByRole("button", { name: /rename/i })).not.toBeInTheDocument();
    });

    it("renames the board on submit and reflects the new name immediately", async () => {
      mockRenameBoard.mockResolvedValue({
        status: "ok",
        board: { id: "1", name: "Renamed Board", ownerId: "u1" },
      });
      const user = userEvent.setup();
      render(<BoardDetail board={board} currentUserId="u1" />);

      await user.click(screen.getByRole("button", { name: /rename/i }));
      const input = screen.getByLabelText(/board name/i);
      await user.clear(input);
      await user.type(input, "Renamed Board");
      await user.click(screen.getByRole("button", { name: /save/i }));

      await waitFor(() => expect(mockRenameBoard).toHaveBeenCalledWith("1", "Renamed Board"));
      expect(screen.getByRole("heading", { level: 1, name: /renamed board/i })).toBeInTheDocument();
    });

    it("shows a clear error message when renaming fails", async () => {
      mockRenameBoard.mockResolvedValue({
        status: "error",
        message: "Could not rename the board. Please try again.",
      });
      const user = userEvent.setup();
      render(<BoardDetail board={board} currentUserId="u1" />);

      await user.click(screen.getByRole("button", { name: /rename/i }));
      await user.click(screen.getByRole("button", { name: /save/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Could not rename the board. Please try again.",
      );
    });
  });

  describe("board delete (owner only)", () => {
    it("shows a delete control for the board owner", () => {
      render(<BoardDetail board={board} currentUserId="u1" />);

      expect(screen.getByRole("button", { name: /delete board/i })).toBeInTheDocument();
    });

    it("hides the delete control for a non-owner member", () => {
      render(<BoardDetail board={board} currentUserId="u2" />);

      expect(screen.queryByRole("button", { name: /delete board/i })).not.toBeInTheDocument();
    });

    it("requires confirmation before deleting, then redirects to the board list", async () => {
      mockDeleteBoard.mockResolvedValue({ status: "ok" });
      const user = userEvent.setup();
      render(<BoardDetail board={board} currentUserId="u1" />);

      await user.click(screen.getByRole("button", { name: /delete board/i }));
      expect(mockDeleteBoard).not.toHaveBeenCalled();

      await user.click(screen.getByRole("button", { name: /confirm delete/i }));

      await waitFor(() => expect(mockDeleteBoard).toHaveBeenCalledWith("1"));
      expect(mockPush).toHaveBeenCalledWith("/boards");
    });

    it("cancels the delete confirmation without calling deleteBoard", async () => {
      const user = userEvent.setup();
      render(<BoardDetail board={board} currentUserId="u1" />);

      await user.click(screen.getByRole("button", { name: /delete board/i }));
      await user.click(screen.getByRole("button", { name: /cancel/i }));

      expect(screen.queryByRole("button", { name: /confirm delete/i })).not.toBeInTheDocument();
      expect(mockDeleteBoard).not.toHaveBeenCalled();
    });
  });

  describe("board:deleted from another client", () => {
    it("redirects a connected member to the board list when the board is deleted live", () => {
      render(<BoardDetail board={board} currentUserId="u2" />);

      act(() => {
        FakeWebSocket.latest().emitMessage({ type: "board:deleted", boardId: "1" });
      });

      expect(mockPush).toHaveBeenCalledWith("/boards");
    });
  });

  describe("card edit", () => {
    it("edits a card's title on submit and reflects it immediately", async () => {
      mockUpdateCard.mockResolvedValue({
        status: "ok",
        card: {
          id: "card1",
          boardId: "1",
          columnId: "c1",
          title: "Write more tests",
          position: 0,
          version: 2,
        },
      });
      const user = userEvent.setup();
      render(<BoardDetail board={board} currentUserId="u1" />);

      const todoColumn = screen.getByRole("heading", { name: /todo/i }).closest("section")!;
      await user.click(within(todoColumn).getAllByRole("button", { name: /^edit$/i })[0]!);
      const input = within(todoColumn).getByDisplayValue("Write tests");
      await user.clear(input);
      await user.type(input, "Write more tests");
      await user.click(within(todoColumn).getByRole("button", { name: /^save$/i }));

      await waitFor(() =>
        expect(mockUpdateCard).toHaveBeenCalledWith("card1", { title: "Write more tests" }),
      );
      expect(within(todoColumn).getByText("Write more tests")).toBeInTheDocument();
    });

    it("shows a clear error message when editing fails", async () => {
      mockUpdateCard.mockResolvedValue({
        status: "error",
        message: "Could not update the card. Please try again.",
      });
      const user = userEvent.setup();
      render(<BoardDetail board={board} currentUserId="u1" />);

      const todoColumn = screen.getByRole("heading", { name: /todo/i }).closest("section")!;
      await user.click(within(todoColumn).getAllByRole("button", { name: /^edit$/i })[0]!);
      await user.click(within(todoColumn).getByRole("button", { name: /^save$/i }));

      expect(await within(todoColumn).findByRole("alert")).toHaveTextContent(
        "Could not update the card. Please try again.",
      );
    });
  });

  describe("card delete", () => {
    it("requires confirmation before deleting, then removes the card", async () => {
      mockDeleteCard.mockResolvedValue({ status: "ok" });
      const user = userEvent.setup();
      render(<BoardDetail board={board} currentUserId="u1" />);

      const todoColumn = screen.getByRole("heading", { name: /todo/i }).closest("section")!;
      await user.click(within(todoColumn).getAllByRole("button", { name: /^delete$/i })[0]!);
      expect(mockDeleteCard).not.toHaveBeenCalled();

      await user.click(within(todoColumn).getByRole("button", { name: /confirm delete/i }));

      await waitFor(() => expect(mockDeleteCard).toHaveBeenCalledWith("card1"));
      expect(within(todoColumn).queryByText("Write tests")).not.toBeInTheDocument();
    });
  });

  it("applies a board rename from another client's board:sync event live", () => {
    render(<BoardDetail board={board} currentUserId="u1" />);

    act(() => {
      FakeWebSocket.latest().emitMessage({
        type: "board:sync",
        board: { id: "1", name: "Renamed Elsewhere", ownerId: "u1" },
        columns: [
          { id: "c1", boardId: "1", name: "Todo", position: 0 },
          { id: "c2", boardId: "1", name: "Done", position: 1 },
        ],
        cards: board.columns[0]!.cards,
      });
    });

    expect(
      screen.getByRole("heading", { level: 1, name: /renamed elsewhere/i }),
    ).toBeInTheDocument();
  });

  it("renders the member list for the board", () => {
    render(<BoardDetail board={board} currentUserId="u1" />);

    expect(screen.getByTitle("Board Owner")).toBeInTheDocument();
  });

  it("shows a color indicator dot in each column header", () => {
    render(<BoardDetail board={board} currentUserId="u1" />);

    const todoHeading = screen.getByRole("heading", { name: /todo/i });
    expect(todoHeading.querySelector("[data-column-dot]")).not.toBeNull();
  });
});
