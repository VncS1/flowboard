import { prisma } from "../db/client.js";

export function accessibleBoardsWhere(userId: string) {
  return { OR: [{ ownerId: userId }, { members: { some: { userId } } }] };
}

export async function findAccessibleBoard(userId: string, boardId: string) {
  return prisma.board.findFirst({
    where: { id: boardId, ...accessibleBoardsWhere(userId) },
  });
}
