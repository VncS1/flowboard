import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";

import { prisma } from "../db/client.js";
import { findAccessibleBoard } from "../lib/boardAccess.js";

const inviteMemberSchema = z.object({
  email: z.string().email(),
});

function userIdFrom(request: FastifyRequest): string {
  return (request.user as { sub: string }).sub;
}

export async function boardMemberRoutes(app: FastifyInstance) {
  app.post<{ Params: { id: string } }>(
    "/boards/:id/members",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const parsed = inviteMemberSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_body", issues: parsed.error.issues });
      }

      const requesterId = userIdFrom(request);
      const board = await findAccessibleBoard(requesterId, request.params.id);
      if (!board) {
        return reply.code(404).send({ error: "not_found" });
      }
      if (board.ownerId !== requesterId) {
        return reply.code(403).send({ error: "owner_only" });
      }

      const invitee = await prisma.user.findUnique({ where: { email: parsed.data.email } });
      if (!invitee) {
        return reply.code(404).send({ error: "user_not_found" });
      }

      const existingMember = await prisma.boardMember.findUnique({
        where: { boardId_userId: { boardId: board.id, userId: invitee.id } },
      });
      if (existingMember) {
        return reply.code(409).send({ error: "already_member" });
      }

      const member = await prisma.boardMember.create({
        data: { boardId: board.id, userId: invitee.id, role: "MEMBER" },
      });

      return reply.code(201).send({ member });
    },
  );

  app.delete<{ Params: { id: string; userId: string } }>(
    "/boards/:id/members/:userId",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const requesterId = userIdFrom(request);
      const board = await findAccessibleBoard(requesterId, request.params.id);
      if (!board) {
        return reply.code(404).send({ error: "not_found" });
      }
      if (board.ownerId !== requesterId) {
        return reply.code(403).send({ error: "owner_only" });
      }

      const member = await prisma.boardMember.findUnique({
        where: { boardId_userId: { boardId: board.id, userId: request.params.userId } },
      });
      if (!member) {
        return reply.code(404).send({ error: "not_found" });
      }

      await prisma.boardMember.delete({ where: { id: member.id } });

      return reply.code(204).send();
    },
  );
}
