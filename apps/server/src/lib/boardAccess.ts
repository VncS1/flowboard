import { prisma } from "../db/client.js";

export async function findAccessibleBoard(userId: string, boardId: string) {
  return prisma.board.findFirst({
    where: {
      id: boardId,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
  });
}
