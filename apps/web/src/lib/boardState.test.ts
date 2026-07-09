import { describe, expect, it } from "vitest";

import { moveCardOptimistically, nestCardsIntoColumns } from "./boardState";

describe("nestCardsIntoColumns", () => {
  it("nests each card under its column, columns and cards ordered by position", () => {
    const columns = [
      { id: "c2", boardId: "b", name: "Done", position: 1 },
      { id: "c1", boardId: "b", name: "Todo", position: 0 },
    ];
    const cards = [
      { id: "card2", boardId: "b", columnId: "c1", title: "Second", position: 1, version: 1 },
      { id: "card1", boardId: "b", columnId: "c1", title: "First", position: 0, version: 1 },
    ];

    const result = nestCardsIntoColumns(columns, cards);

    expect(result.map((column) => column.id)).toEqual(["c1", "c2"]);
    expect(result[0].cards.map((card) => card.id)).toEqual(["card1", "card2"]);
    expect(result[1].cards).toEqual([]);
  });
});

describe("moveCardOptimistically", () => {
  const columns = [
    {
      id: "c1",
      boardId: "b",
      name: "Todo",
      position: 0,
      cards: [
        { id: "card1", boardId: "b", columnId: "c1", title: "Card", position: 0, version: 1 },
      ],
    },
    { id: "c2", boardId: "b", name: "Done", position: 1, cards: [] },
  ];

  it("removes the card from its source column and inserts it into the target column", () => {
    const result = moveCardOptimistically(columns, {
      cardId: "card1",
      toColumnId: "c2",
      toPosition: 0,
    });

    expect(result.find((column) => column.id === "c1")!.cards).toEqual([]);
    expect(result.find((column) => column.id === "c2")!.cards).toMatchObject([
      { id: "card1", columnId: "c2", position: 0 },
    ]);
  });

  it("inserts the moved card at the given position among the target column's existing cards", () => {
    const withExisting = [
      { id: "c1", boardId: "b", name: "Todo", position: 0, cards: [] },
      {
        id: "c2",
        boardId: "b",
        name: "Done",
        position: 1,
        cards: [
          { id: "cardA", boardId: "b", columnId: "c2", title: "A", position: 0, version: 1 },
          { id: "cardB", boardId: "b", columnId: "c2", title: "B", position: 1, version: 1 },
        ],
      },
      {
        id: "c3",
        boardId: "b",
        name: "Backlog",
        position: 2,
        cards: [{ id: "cardM", boardId: "b", columnId: "c3", title: "M", position: 0, version: 1 }],
      },
    ];

    const result = moveCardOptimistically(withExisting, {
      cardId: "cardM",
      toColumnId: "c2",
      toPosition: 1,
    });

    expect(result.find((column) => column.id === "c2")!.cards.map((card) => card.id)).toEqual([
      "cardA",
      "cardM",
      "cardB",
    ]);
  });

  it("returns the original columns unchanged when the card does not exist", () => {
    const result = moveCardOptimistically(columns, {
      cardId: "missing",
      toColumnId: "c2",
      toPosition: 0,
    });

    expect(result).toBe(columns);
  });
});
