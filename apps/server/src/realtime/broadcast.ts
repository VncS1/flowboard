import type { ServerToClientMessage } from "@flowboard/shared";
import type { WebSocket } from "ws";

import { prisma } from "../db/client.js";

const boardSockets = new Map<string, Set<WebSocket>>();

export function subscribe(boardId: string, socket: WebSocket) {
  let sockets = boardSockets.get(boardId);
  if (!sockets) {
    sockets = new Set();
    boardSockets.set(boardId, sockets);
  }
  sockets.add(socket);
}

export function unsubscribe(boardId: string, socket: WebSocket) {
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

export function broadcast(boardId: string, message: ServerToClientMessage, exclude?: WebSocket) {
  const sockets = boardSockets.get(boardId);
  if (!sockets) return;
  for (const socket of sockets) {
    if (socket !== exclude) {
      send(socket, message);
    }
  }
}

export async function buildBoardSync(boardId: string): Promise<ServerToClientMessage> {
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

export async function broadcastBoardSync(boardId: string, exclude?: WebSocket) {
  broadcast(boardId, await buildBoardSync(boardId), exclude);
}

export { send };
