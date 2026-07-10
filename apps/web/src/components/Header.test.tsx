import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const mockLogout = vi.fn();
vi.mock("@/lib/auth", () => ({ logout: (...args: unknown[]) => mockLogout(...args) }));

import { Header } from "./Header";

describe("Header", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockRefresh.mockClear();
    mockLogout.mockReset();
    mockLogout.mockResolvedValue(undefined);
  });

  it("links back to the board list", () => {
    render(<Header user={{ id: "u1", email: "alice@example.com", name: "Alice" }} />);

    expect(screen.getByRole("link", { name: /boards/i })).toHaveAttribute("href", "/boards");
  });

  it("shows the current board name when provided", () => {
    render(
      <Header
        user={{ id: "u1", email: "alice@example.com", name: "Alice" }}
        boardName="Sprint Board"
      />,
    );

    expect(screen.getByText("Sprint Board")).toBeInTheDocument();
  });

  it("does not show a board name when none is provided", () => {
    render(<Header user={{ id: "u1", email: "alice@example.com", name: "Alice" }} />);

    expect(screen.queryByText("Sprint Board")).not.toBeInTheDocument();
  });

  it("shows the signed-in user's name", () => {
    render(<Header user={{ id: "u1", email: "alice@example.com", name: "Alice" }} />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("shows an avatar with the user's initials", () => {
    render(<Header user={{ id: "u1", email: "alice@example.com", name: "Alice Smith" }} />);

    expect(screen.getByTitle("Alice Smith")).toHaveTextContent("AS");
  });

  it("signs out and redirects to /login on click", async () => {
    const user = userEvent.setup();
    render(<Header user={{ id: "u1", email: "alice@example.com", name: "Alice" }} />);

    await user.click(screen.getByRole("button", { name: /sign out/i }));

    await waitFor(() => expect(mockLogout).toHaveBeenCalled());
    expect(mockPush).toHaveBeenCalledWith("/login");
    expect(mockRefresh).toHaveBeenCalled();
  });
});
