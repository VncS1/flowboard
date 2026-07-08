import { describe, expect, test } from "vitest";

import { prisma } from "./client.js";

describe("Prisma schema", () => {
  test("creates a User/Board/Column/Card graph with a default card version of 1", async () => {
    const user = await prisma.user.create({
      data: {
        email: "ada@example.com",
        name: "Ada Lovelace",
        passwordHash: "hashed-password",
      },
    });

    const board = await prisma.board.create({
      data: { name: "Ada's Board", ownerId: user.id },
    });

    const column = await prisma.column.create({
      data: { name: "Todo", position: 0, boardId: board.id },
    });

    const card = await prisma.card.create({
      data: {
        title: "Write tests first",
        position: 0,
        boardId: board.id,
        columnId: column.id,
      },
    });

    expect(card.version).toBe(1);
    expect(card.boardId).toBe(board.id);
    expect(card.columnId).toBe(column.id);
  });

  test("rejects a second user with a duplicate email", async () => {
    await prisma.user.create({
      data: { email: "dup@example.com", name: "First", passwordHash: "x" },
    });

    await expect(
      prisma.user.create({
        data: { email: "dup@example.com", name: "Second", passwordHash: "y" },
      }),
    ).rejects.toThrow();
  });

  test("deleting a board cascades to its columns and cards", async () => {
    const user = await prisma.user.create({
      data: { email: "cascade@example.com", name: "Cascade", passwordHash: "x" },
    });
    const board = await prisma.board.create({
      data: { name: "Temp Board", ownerId: user.id },
    });
    const column = await prisma.column.create({
      data: { name: "Doing", position: 0, boardId: board.id },
    });
    await prisma.card.create({
      data: { title: "Card", position: 0, boardId: board.id, columnId: column.id },
    });

    await prisma.board.delete({ where: { id: board.id } });

    expect(await prisma.column.findUnique({ where: { id: column.id } })).toBeNull();
    expect(await prisma.card.findMany({ where: { boardId: board.id } })).toHaveLength(0);
  });
});
