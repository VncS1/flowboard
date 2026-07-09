import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const mockCreateBoard = vi.fn();
vi.mock("@/lib/boardActions", () => ({
  createBoard: (...args: unknown[]) => mockCreateBoard(...args),
}));

import { CreateBoardForm } from "./CreateBoardForm";

describe("CreateBoardForm", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockRefresh.mockClear();
    mockCreateBoard.mockReset();
  });

  it("submits the entered board name", async () => {
    mockCreateBoard.mockResolvedValue({
      status: "ok",
      board: { id: "b1", name: "Sprint Board", ownerId: "u1" },
    });
    const user = userEvent.setup();
    render(<CreateBoardForm />);

    await user.type(screen.getByLabelText(/board name/i), "Sprint Board");
    await user.click(screen.getByRole("button", { name: /create board/i }));

    await waitFor(() => expect(mockCreateBoard).toHaveBeenCalledWith("Sprint Board"));
  });

  it("navigates to the new board on success", async () => {
    mockCreateBoard.mockResolvedValue({
      status: "ok",
      board: { id: "b1", name: "Sprint Board", ownerId: "u1" },
    });
    const user = userEvent.setup();
    render(<CreateBoardForm />);

    await user.type(screen.getByLabelText(/board name/i), "Sprint Board");
    await user.click(screen.getByRole("button", { name: /create board/i }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/boards/b1"));
  });

  it("shows a clear error message and does not navigate on failure", async () => {
    mockCreateBoard.mockResolvedValue({
      status: "error",
      message: "Could not create the board. Please try again.",
    });
    const user = userEvent.setup();
    render(<CreateBoardForm />);

    await user.type(screen.getByLabelText(/board name/i), "Sprint Board");
    await user.click(screen.getByRole("button", { name: /create board/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not create the board. Please try again.",
    );
    expect(mockPush).not.toHaveBeenCalled();
  });
});
