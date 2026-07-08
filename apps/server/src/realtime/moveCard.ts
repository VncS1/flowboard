import { prisma } from "../db/client.js";

type CardRecord = Awaited<ReturnType<typeof prisma.card.findUniqueOrThrow>>;

export type MoveCardInput = {
  cardId: string;
  toColumnId: string;
  toPosition: number;
  expectedVersion: number;
};

export type MoveCardResult =
  { outcome: "moved"; card: CardRecord } | { outcome: "conflict"; card: CardRecord };

export async function moveCard(input: MoveCardInput): Promise<MoveCardResult> {
  const affectedRows = await prisma.$executeRaw`
    UPDATE "Card"
    SET "columnId" = ${input.toColumnId}, "position" = ${input.toPosition}, "version" = "version" + 1
    WHERE "id" = ${input.cardId} AND "version" = ${input.expectedVersion}
  `;

  const card = await prisma.card.findUniqueOrThrow({ where: { id: input.cardId } });

  return affectedRows === 0 ? { outcome: "conflict", card } : { outcome: "moved", card };
}
