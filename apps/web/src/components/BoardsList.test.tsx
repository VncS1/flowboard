import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BoardsList } from "./BoardsList";

describe("BoardsList", () => {
  it("renders a link to each board's detail page", () => {
    render(
      <BoardsList
        boards={[
          { id: "1", name: "Sprint Board", ownerId: "u1", columns: [] },
          { id: "2", name: "Marketing", ownerId: "u1", columns: [] },
        ]}
      />,
    );

    const sprintLink = screen.getByRole("link", { name: /sprint board/i });
    expect(sprintLink).toHaveAttribute("href", "/boards/1");
    expect(screen.getByRole("link", { name: /marketing/i })).toHaveAttribute("href", "/boards/2");
  });

  it("shows the column count for each board", () => {
    render(
      <BoardsList
        boards={[
          {
            id: "1",
            name: "Sprint Board",
            ownerId: "u1",
            columns: [
              { id: "c1", boardId: "1", name: "Todo", position: 0 },
              { id: "c2", boardId: "1", name: "Doing", position: 1 },
            ],
          },
        ]}
      />,
    );

    expect(screen.getByText(/2 columns/i)).toBeInTheDocument();
  });

  it("shows an empty state when there are no boards", () => {
    render(<BoardsList boards={[]} />);

    expect(screen.getByText(/no boards yet/i)).toBeInTheDocument();
  });
});
