import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

const { getBoardsMock, getCurrentUserMock } = vi.hoisted(() => ({
  getBoardsMock: vi.fn(),
  getCurrentUserMock: vi.fn(),
}));
vi.mock("@/lib/api", () => ({
  getBoards: getBoardsMock,
  getCurrentUser: getCurrentUserMock,
}));

import BoardsPage from "./page";

describe("BoardsPage", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    getBoardsMock.mockReset();
    getCurrentUserMock.mockReset();
  });

  it("redirects to /login when unauthenticated", async () => {
    getBoardsMock.mockResolvedValue({ status: "unauthenticated" });

    render(<BoardsPage />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/login"));
  });

  it("renders the boards list once authenticated", async () => {
    getBoardsMock.mockResolvedValue({
      status: "ok",
      boards: [{ id: "1", name: "Sprint Board", ownerId: "u1", columns: [] }],
    });
    getCurrentUserMock.mockResolvedValue({
      status: "ok",
      user: { id: "u1", email: "alice@example.com", name: "Alice" },
    });

    render(<BoardsPage />);

    expect(await screen.findByRole("link", { name: /sprint board/i })).toHaveAttribute(
      "href",
      "/boards/1",
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
