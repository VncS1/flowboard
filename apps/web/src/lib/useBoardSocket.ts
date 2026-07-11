import { useCallback, useEffect, useRef } from "react";

import {
  serverToClientMessageSchema,
  type BoardDeletedMessage,
  type BoardSyncMessage,
  type CardConflictMessage,
  type ClientToServerMessage,
} from "@flowboard/shared";

export type BoardSocketHandlers = {
  onSync: (message: BoardSyncMessage) => void;
  onConflict: (message: CardConflictMessage) => void;
  onBoardDeleted: (message: BoardDeletedMessage) => void;
};

export type BoardSocket = {
  send: (message: ClientToServerMessage) => void;
};

function resolveWsUrl(boardId: string): string {
  const base = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000";
  return `${base}/ws/boards/${boardId}`;
}

export function useBoardSocket(boardId: string, handlers: BoardSocketHandlers): BoardSocket {
  const socketRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const pendingRef = useRef<string[]>([]);

  useEffect(() => {
    const socket = new WebSocket(resolveWsUrl(boardId));
    socketRef.current = socket;
    pendingRef.current = [];

    function handleOpen() {
      for (const data of pendingRef.current) {
        socket.send(data);
      }
      pendingRef.current = [];
    }

    function handleMessage(event: MessageEvent) {
      let raw: unknown;
      try {
        raw = JSON.parse(String(event.data));
      } catch (error) {
        console.error("flowboard: discarding non-JSON WebSocket message", error);
        return;
      }

      const parsed = serverToClientMessageSchema.safeParse(raw);
      if (!parsed.success) {
        console.error(
          "flowboard: discarding WebSocket message that failed schema validation",
          parsed.error.issues,
        );
        return;
      }

      if (parsed.data.type === "board:sync") {
        handlersRef.current.onSync(parsed.data);
      } else if (parsed.data.type === "board:deleted") {
        handlersRef.current.onBoardDeleted(parsed.data);
      } else {
        handlersRef.current.onConflict(parsed.data);
      }
    }

    socket.addEventListener("open", handleOpen);
    socket.addEventListener("message", handleMessage);

    return () => {
      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("message", handleMessage);
      socket.close();
      socketRef.current = null;
    };
  }, [boardId]);

  const send = useCallback((message: ClientToServerMessage) => {
    const socket = socketRef.current;
    const data = JSON.stringify(message);
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(data);
    } else {
      pendingRef.current.push(data);
    }
  }, []);

  return { send };
}
