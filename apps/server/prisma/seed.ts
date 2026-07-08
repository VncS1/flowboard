import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client.js";

const adapter = new PrismaPg({ connectionString: process.env["DATABASE_URL"] });
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@flowboard.dev" },
    update: {},
    create: {
      email: "demo@flowboard.dev",
      name: "Demo User",
      passwordHash: "seed-only-not-a-real-hash",
    },
  });

  const board = await prisma.board.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Demo Board",
      ownerId: user.id,
    },
  });

  const columns = await Promise.all(
    [
      { id: "00000000-0000-0000-0000-000000000011", name: "Todo", position: 0 },
      { id: "00000000-0000-0000-0000-000000000012", name: "Doing", position: 1 },
      { id: "00000000-0000-0000-0000-000000000013", name: "Done", position: 2 },
    ].map((column) =>
      prisma.column.upsert({
        where: { id: column.id },
        update: {},
        create: { ...column, boardId: board.id },
      }),
    ),
  );

  await prisma.card.upsert({
    where: { id: "00000000-0000-0000-0000-000000000021" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000021",
      title: "Set up the board",
      position: 0,
      boardId: board.id,
      columnId: columns[0]!.id,
    },
  });

  console.log(`Seeded demo user ${user.email} with board "${board.name}"`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
