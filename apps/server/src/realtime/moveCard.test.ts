import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { prisma } from "../db/client.js";
import { moveCard } from "./moveCard.js";

async function seedCardWithTwoColumns() {
  const owner = await prisma.user.create({
    data: { email: `owner-${randomUUID()}@example.com`, name: "Owner", passwordHash: "x" },
  });
  const board = await prisma.board.create({ data: { name: "Board", ownerId: owner.id } });
  const columnA = await prisma.column.create({
    data: { name: "Todo", position: 0, boardId: board.id },
  });
  const columnB = await prisma.column.create({
    data: { name: "Doing", position: 1, boardId: board.id },
  });
  const card = await prisma.card.create({
    data: { title: "Card", position: 0, boardId: board.id, columnId: columnA.id },
  });
  return { columnB, card };
}

describe("moveCard", () => {
  it("only one of two concurrent moves at the same starting version succeeds", async () => {
    const { columnB, card } = await seedCardWithTwoColumns();

    const [resultA, resultB] = await Promise.all([
      moveCard({
        cardId: card.id,
        toColumnId: columnB.id,
        toPosition: 0,
        expectedVersion: card.version,
      }),
      moveCard({
        cardId: card.id,
        toColumnId: columnB.id,
        toPosition: 1,
        expectedVersion: card.version,
      }),
    ]);

    const outcomes = [resultA.outcome, resultB.outcome].sort();
    expect(outcomes).toEqual(["conflict", "moved"]);

    const winner = resultA.outcome === "moved" ? resultA : resultB;
    const loser = resultA.outcome === "moved" ? resultB : resultA;

    const persisted = await prisma.card.findUniqueOrThrow({ where: { id: card.id } });

    expect(persisted.version).toBe(card.version + 1);
    expect(persisted.position).toBe(winner.card.position);
    expect(loser.card).toMatchObject({ version: persisted.version, position: persisted.position });
  });
});
