import { clientToServerMessageSchema, type ServerToClientMessage } from "@flowboard/shared";
import websocketPlugin from "@fastify/websocket";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import type { WebSocket } from "ws";

import { prisma } from "../db/client.js";
import { moveCard } from "./moveCard.js";

const boardSockets = new Map<string, Set<WebSocket>>();

function subscribe(boardId: string, socket: WebSocket) {
  let sockets = boardSockets.get(boardId);
  if (!sockets) {
    sockets = new Set();
    boardSockets.set(boardId, sockets);
  }
  sockets.add(socket);
}

function unsubscribe(boardId: string, socket: WebSocket) {
  const sockets = boardSockets.get(boardId);
  if (!sockets) return;
  sockets.delete(socket);
  if (sockets.size === 0) {
    boardSockets.delete(boardId);
  }
}

function send(socket: WebSocket, message: ServerToClientMessage) {
  socket.send(JSON.stringify(message));
}

function broadcast(boardId: string, message: ServerToClientMessage, exclude: WebSocket) {
  const sockets = boardSockets.get(boardId);
  if (!sockets) return;
  for (const socket of sockets) {
    if (socket !== exclude) {
      send(socket, message);
    }
  }
}

function userIdFrom(request: FastifyRequest): string {
  return (request.user as { sub: string }).sub;
}

async function boardAccessGuard(
  request: FastifyRequest<{ Params: { boardId: string } }>,
  reply: FastifyReply,
) {
  const board = await prisma.board.findFirst({
    where: { id: request.params.boardId, ownerId: userIdFrom(request) },
  });
  if (!board) {
    await reply.code(404).send({ error: "not_found" });
  }
}

async function buildBoardSync(boardId: string): Promise<ServerToClientMessage> {
  const board = await prisma.board.findUniqueOrThrow({
    where: { id: boardId },
    include: { columns: { orderBy: { position: "asc" } }, cards: true },
  });

  return {
    type: "board:sync",
    board: { id: board.id, name: board.name, ownerId: board.ownerId },
    columns: board.columns.map((column) => ({
      id: column.id,
      boardId: column.boardId,
      name: column.name,
      position: column.position,
    })),
    cards: board.cards.map((card) => ({
      id: card.id,
      boardId: card.boardId,
      columnId: card.columnId,
      title: card.title,
      description: card.description ?? undefined,
      position: card.position,
      version: card.version,
    })),
  };
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

            broadcast(boardId, await buildBoardSync(boardId), socket);
          }
        })();
      });

      socket.on("close", () => {
        unsubscribe(boardId, socket);
      });
    },
  );
});
