import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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
});
