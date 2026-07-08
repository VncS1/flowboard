import { afterAll, afterEach } from "vitest";

import { prisma } from "../db/client.js";

afterEach(async () => {
  await prisma.$transaction([
    prisma.card.deleteMany(),
    prisma.column.deleteMany(),
    prisma.board.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});

afterAll(async () => {
  await prisma.$disconnect();
});
