import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

import { prisma } from "../db/client.js";
import { findAccessibleBoard } from "../lib/boardAccess.js";
import { broadcastBoardSync } from "../realtime/broadcast.js";

const createBoardSchema = z.object({
  name: z.string().min(1),
});

const renameBoardSchema = z.object({
  name: z.string().min(1),
});

const DEFAULT_COLUMNS = ["Todo", "Doing", "Done"];

function userIdFrom(request: FastifyRequest): string {
  return (request.user as { sub: string }).sub;
}

export async function boardRoutes(app: FastifyInstance) {
  app.post(
    "/boards",
    { preHandler: app.authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = createBoardSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_body", issues: parsed.error.issues });
      }

      const ownerId = userIdFrom(request);
      const board = await prisma.board.create({
        data: {
          name: parsed.data.name,
          ownerId,
          columns: {
            create: DEFAULT_COLUMNS.map((name, position) => ({ name, position })),
          },
        },
        include: { columns: { orderBy: { position: "asc" } } },
      });

      return reply.code(201).send({ board });
    },
  );

  app.get(
    "/boards",
    { preHandler: app.authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const boards = await prisma.board.findMany({
        where: { ownerId: userIdFrom(request) },
        include: { columns: { orderBy: { position: "asc" } } },
      });

      return reply.code(200).send({ boards });
    },
  );

  app.get<{ Params: { id: string } }>(
    "/boards/:id",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const accessible = await findAccessibleBoard(userIdFrom(request), request.params.id);
      if (!accessible) {
        return reply.code(404).send({ error: "not_found" });
      }

      const board = await prisma.board.findUniqueOrThrow({
        where: { id: accessible.id },
        include: {
          columns: {
            orderBy: { position: "asc" },
            include: { cards: { orderBy: { position: "asc" } } },
          },
          owner: true,
          members: { include: { user: true } },
        },
      });

      const members = [
        {
          id: board.owner.id,
          name: board.owner.name,
          email: board.owner.email,
          role: "OWNER" as const,
        },
        ...board.members.map((member) => ({
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
          role: member.role,
        })),
      ];

      return reply.code(200).send({
        board: {
          id: board.id,
          name: board.name,
          ownerId: board.ownerId,
          columns: board.columns,
          members,
        },
      });
    },
  );

  app.patch<{ Params: { id: string } }>(
    "/boards/:id",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const parsed = renameBoardSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_body", issues: parsed.error.issues });
      }

      const existing = await prisma.board.findFirst({
        where: { id: request.params.id, ownerId: userIdFrom(request) },
      });
      if (!existing) {
        return reply.code(404).send({ error: "not_found" });
      }

      const board = await prisma.board.update({
        where: { id: existing.id },
        data: { name: parsed.data.name },
        include: { columns: { orderBy: { position: "asc" } } },
      });

      await broadcastBoardSync(board.id);

      return reply.code(200).send({ board });
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/boards/:id",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const existing = await prisma.board.findFirst({
        where: { id: request.params.id, ownerId: userIdFrom(request) },
      });
      if (!existing) {
        return reply.code(404).send({ error: "not_found" });
      }

      await prisma.board.delete({ where: { id: existing.id } });

      return reply.code(204).send();
    },
  );
}
