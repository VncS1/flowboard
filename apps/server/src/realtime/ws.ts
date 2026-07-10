import { clientToServerMessageSchema } from "@flowboard/shared";
import websocketPlugin from "@fastify/websocket";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

import { findAccessibleBoard } from "../lib/boardAccess.js";
import { broadcastBoardSync, send, subscribe, unsubscribe } from "./broadcast.js";
import { moveCard } from "./moveCard.js";

function userIdFrom(request: FastifyRequest): string {
  return (request.user as { sub: string }).sub;
}

async function boardAccessGuard(
  request: FastifyRequest<{ Params: { boardId: string } }>,
  reply: FastifyReply,
) {
  const board = await findAccessibleBoard(userIdFrom(request), request.params.boardId);
  if (!board) {
    await reply.code(404).send({ error: "not_found" });
  }
}

export const realtimeRoutes = fp(async (app: FastifyInstance) => {
  await app.register(websocketPlugin);

  app.get<{ Params: { boardId: string } }>(
    "/ws/boards/:boardId",
    { websocket: true, preHandler: [app.authenticate, boardAccessGuard] },
    (socket, request) => {
      const { boardId } = request.params;
      subscribe(boardId, socket);

      socket.on("message", (raw: Buffer) => {
        void (async () => {
          const parsed = clientToServerMessageSchema.safeParse(JSON.parse(raw.toString()));
          if (!parsed.success) return;

          if (parsed.data.type === "card:move") {
            const { cardId, toColumnId, toPosition, version } = parsed.data;
            const result = await moveCard({
              cardId,
              toColumnId,
              toPosition,
              expectedVersion: version,
            });

            if (result.outcome === "conflict") {
              send(socket, {
                type: "card:conflict",
                cardId,
                reason: "stale-version",
                card: {
                  id: result.card.id,
                  boardId: result.card.boardId,
                  columnId: result.card.columnId,
                  title: result.card.title,
                  description: result.card.description ?? undefined,
                  position: result.card.position,
                  version: result.card.version,
                },
              });
              return;
            }

            await broadcastBoardSync(boardId, socket);
          }
        })();
      });

      socket.on("close", () => {
        unsubscribe(boardId, socket);
      });
    },
  );
});
