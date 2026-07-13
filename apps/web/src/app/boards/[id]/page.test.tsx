import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockReplace = vi.fn();
const mockNotFound = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useParams: () => ({ id: "board-1" }),
  notFound: () => mockNotFound(),
}));

const { getBoardMock, getCurrentUserMock } = vi.hoisted(() => ({
  getBoardMock: vi.fn(),
  getCurrentUserMock: vi.fn(),
}));
vi.mock("@/lib/api", () => ({
  getBoard: getBoardMock,
  getCurrentUser: getCurrentUserMock,
}));

vi.mock("@/components/BoardDetail", () => ({
  BoardDetail: ({ board }: { board: { name: string } }) => (
    <div data-testid="board-detail">{board.name}</div>
  ),
}));

import BoardPage from "./page";

describe("BoardPage", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockNotFound.mockClear();
    getBoardMock.mockReset();
    getCurrentUserMock.mockReset();
  });

  it("redirects to /login when unauthenticated", async () => {
    getBoardMock.mockResolvedValue({ status: "unauthenticated" });

    render(<BoardPage />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/login"));
  });

  it("calls notFound() when the board does not exist", async () => {
    getBoardMock.mockResolvedValue({ status: "not-found" });

    render(<BoardPage />);

    await waitFor(() => expect(mockNotFound).toHaveBeenCalled());
  });

  it("renders the board once authenticated", async () => {
    getBoardMock.mockResolvedValue({
      status: "ok",
      board: { id: "board-1", name: "Sprint Board", ownerId: "u1", columns: [], members: [] },
    });
    getCurrentUserMock.mockResolvedValue({
      status: "ok",
      user: { id: "u1", email: "alice@example.com", name: "Alice" },
    });

    render(<BoardPage />);

    expect(await screen.findByTestId("board-detail")).toHaveTextContent("Sprint Board");
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockNotFound).not.toHaveBeenCalled();
  });
});
