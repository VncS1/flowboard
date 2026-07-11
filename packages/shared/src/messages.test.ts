import { describe, expect, it } from "vitest";
import {
  boardDeletedMessageSchema,
  boardSyncMessageSchema,
  cardConflictMessageSchema,
  cardCreateMessageSchema,
  cardDeleteMessageSchema,
  cardMoveMessageSchema,
  cardUpdateMessageSchema,
} from "./messages.js";

describe("cardMoveMessageSchema", () => {
  it("parses a valid card:move message", () => {
    const message = {
      type: "card:move",
      cardId: "card-1",
      toColumnId: "col-2",
      toPosition: 3,
      version: 5,
    };

    expect(cardMoveMessageSchema.parse(message)).toEqual(message);
  });

  it("rejects a message missing version", () => {
    const message = {
      type: "card:move",
      cardId: "card-1",
      toColumnId: "col-2",
      toPosition: 3,
    };

    expect(() => cardMoveMessageSchema.parse(message)).toThrow();
  });

  it("rejects a negative toPosition", () => {
    const message = {
      type: "card:move",
      cardId: "card-1",
      toColumnId: "col-2",
      toPosition: -1,
      version: 5,
    };

    expect(() => cardMoveMessageSchema.parse(message)).toThrow();
  });

  it("rejects the wrong discriminant type", () => {
    const message = {
      type: "card:create",
      cardId: "card-1",
      toColumnId: "col-2",
      toPosition: 3,
      version: 5,
    };

    expect(() => cardMoveMessageSchema.parse(message)).toThrow();
  });
});

describe("cardCreateMessageSchema", () => {
  it("parses a valid card:create message", () => {
    const message = {
      type: "card:create",
      boardId: "board-1",
      columnId: "col-1",
      title: "New card",
      position: 0,
    };

    expect(cardCreateMessageSchema.parse(message)).toEqual(message);
  });

  it("rejects an empty title", () => {
    const message = {
      type: "card:create",
      boardId: "board-1",
      columnId: "col-1",
      title: "",
      position: 0,
    };

    expect(() => cardCreateMessageSchema.parse(message)).toThrow();
  });
});

describe("cardUpdateMessageSchema", () => {
  it("parses a valid card:update message with a partial patch", () => {
    const message = {
      type: "card:update",
      cardId: "card-1",
      version: 2,
      title: "Renamed",
    };

    expect(cardUpdateMessageSchema.parse(message)).toEqual(message);
  });

  it("rejects a message missing cardId", () => {
    const message = {
      type: "card:update",
      version: 2,
      title: "Renamed",
    };

    expect(() => cardUpdateMessageSchema.parse(message)).toThrow();
  });
});

describe("cardDeleteMessageSchema", () => {
  it("parses a valid card:delete message", () => {
    const message = { type: "card:delete", cardId: "card-1", version: 2 };

    expect(cardDeleteMessageSchema.parse(message)).toEqual(message);
  });

  it("rejects a non-integer version", () => {
    const message = { type: "card:delete", cardId: "card-1", version: 2.5 };

    expect(() => cardDeleteMessageSchema.parse(message)).toThrow();
  });
});

describe("boardSyncMessageSchema", () => {
  it("parses a valid board:sync message", () => {
    const message = {
      type: "board:sync",
      board: { id: "board-1", name: "Roadmap", ownerId: "user-1" },
      columns: [{ id: "col-1", boardId: "board-1", name: "Todo", position: 0 }],
      cards: [
        {
          id: "card-1",
          columnId: "col-1",
          boardId: "board-1",
          title: "Ship it",
          position: 0,
          version: 1,
        },
      ],
    };

    expect(boardSyncMessageSchema.parse(message)).toEqual(message);
  });

  it("rejects a card with version 0", () => {
    const message = {
      type: "board:sync",
      board: { id: "board-1", name: "Roadmap", ownerId: "user-1" },
      columns: [],
      cards: [
        {
          id: "card-1",
          columnId: "col-1",
          boardId: "board-1",
          title: "Ship it",
          position: 0,
          version: 0,
        },
      ],
    };

    expect(() => boardSyncMessageSchema.parse(message)).toThrow();
  });
});

describe("cardConflictMessageSchema", () => {
  it("parses a valid card:conflict message", () => {
    const message = {
      type: "card:conflict",
      cardId: "card-1",
      reason: "stale-version",
      card: {
        id: "card-1",
        columnId: "col-1",
        boardId: "board-1",
        title: "Ship it",
        position: 0,
        version: 4,
      },
    };

    expect(cardConflictMessageSchema.parse(message)).toEqual(message);
  });

  it("rejects an invalid reason", () => {
    const message = {
      type: "card:conflict",
      cardId: "card-1",
      reason: "because I said so",
      card: {
        id: "card-1",
        columnId: "col-1",
        boardId: "board-1",
        title: "Ship it",
        position: 0,
        version: 4,
      },
    };

    expect(() => cardConflictMessageSchema.parse(message)).toThrow();
  });
});

describe("boardDeletedMessageSchema", () => {
  it("parses a valid board:deleted message", () => {
    const message = { type: "board:deleted", boardId: "board-1" };

    expect(boardDeletedMessageSchema.parse(message)).toEqual(message);
  });

  it("rejects a message missing boardId", () => {
    const message = { type: "board:deleted" };

    expect(() => boardDeletedMessageSchema.parse(message)).toThrow();
  });

  it("rejects the wrong discriminant type", () => {
    const message = { type: "board:sync", boardId: "board-1" };

    expect(() => boardDeletedMessageSchema.parse(message)).toThrow();
  });
});
