import { useCallback, useEffect, useRef } from "react";

import {
  serverToClientMessageSchema,
  type BoardSyncMessage,
  type CardConflictMessage,
  type ClientToServerMessage,
} from "@flowboard/shared";

export type BoardSocketHandlers = {
  onSync: (message: BoardSyncMessage) => void;
  onConflict: (message: CardConflictMessage) => void;
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

  useEffect(() => {
    const socket = new WebSocket(resolveWsUrl(boardId));
    socketRef.current = socket;

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
      } else {
        handlersRef.current.onConflict(parsed.data);
      }
    }

    socket.addEventListener("message", handleMessage);

    return () => {
      socket.removeEventListener("message", handleMessage);
      socket.close();
      socketRef.current = null;
    };
  }, [boardId]);

  const send = useCallback((message: ClientToServerMessage) => {
    socketRef.current?.send(JSON.stringify(message));
  }, []);

  return { send };
}
