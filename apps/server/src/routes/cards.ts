import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";

import { prisma } from "../db/client.js";

const createCardSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
});

const renameCardSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
});

function userIdFrom(request: FastifyRequest): string {
  return (request.user as { sub: string }).sub;
}

export async function cardRoutes(app: FastifyInstance) {
  app.post<{ Params: { boardId: string; columnId: string } }>(
    "/boards/:boardId/columns/:columnId/cards",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const parsed = createCardSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_body", issues: parsed.error.issues });
      }

      const { boardId, columnId } = request.params;
      const column = await prisma.column.findFirst({
        where: { id: columnId, boardId, board: { ownerId: userIdFrom(request) } },
      });
      if (!column) {
        return reply.code(404).send({ error: "not_found" });
      }

      const cardCount = await prisma.card.count({ where: { columnId } });
      const card = await prisma.card.create({
        data: {
          title: parsed.data.title,
          description: parsed.data.description,
          position: cardCount,
          boardId,
          columnId,
        },
      });

      return reply.code(201).send({ card });
    },
  );

  app.patch<{ Params: { id: string } }>(
    "/cards/:id",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const parsed = renameCardSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_body", issues: parsed.error.issues });
      }

      const existing = await prisma.card.findFirst({
        where: { id: request.params.id, board: { ownerId: userIdFrom(request) } },
      });
      if (!existing) {
        return reply.code(404).send({ error: "not_found" });
      }

      const card = await prisma.card.update({
        where: { id: existing.id },
        data: parsed.data,
      });

      return reply.code(200).send({ card });
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/cards/:id",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const existing = await prisma.card.findFirst({
        where: { id: request.params.id, board: { ownerId: userIdFrom(request) } },
      });
      if (!existing) {
        return reply.code(404).send({ error: "not_found" });
      }

      await prisma.card.delete({ where: { id: existing.id } });

      return reply.code(204).send();
    },
  );
}
