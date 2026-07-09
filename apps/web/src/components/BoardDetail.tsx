"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, type ReactNode } from "react";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";

import type { BoardSyncMessage, CardConflictMessage, CardMoveMessage } from "@flowboard/shared";

import type { BoardDetail as BoardDetailData } from "@/lib/api";
import { moveCardOptimistically, nestCardsIntoColumns, type BoardColumns } from "@/lib/boardState";
import { useBoardSocket } from "@/lib/useBoardSocket";

function DraggableCard({ id, title }: { id: string; title: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`bg-bg border-border rounded-md border px-3 py-2 text-sm ${
        isDragging ? "opacity-50" : ""
      }`}
      {...attributes}
      {...listeners}
    >
      {title}
    </li>
  );
}

function DroppableColumn({
  id,
  name,
  children,
}: {
  id: string;
  name: string;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <section
      ref={setNodeRef}
      className={`bg-surface w-72 shrink-0 rounded-md border p-4 ${
        isOver ? "border-primary" : "border-border"
      }`}
    >
      <h2 className="mb-3 text-sm font-medium">{name}</h2>
      {children}
    </section>
  );
}

export function BoardDetail({ board }: { board: BoardDetailData }) {
  const router = useRouter();
  const [columns, setColumns] = useState<BoardColumns>(board.columns);
  const pendingSnapshots = useRef(new Map<string, BoardColumns>());

  const handleSync = useCallback((message: BoardSyncMessage) => {
    pendingSnapshots.current.clear();
    setColumns(nestCardsIntoColumns(message.columns, message.cards));
  }, []);

  const handleConflict = useCallback(
    (message: CardConflictMessage) => {
      const snapshot = pendingSnapshots.current.get(message.cardId);
      if (snapshot) {
        setColumns(snapshot);
        pendingSnapshots.current.delete(message.cardId);
      }
      router.refresh();
    },
    [router],
  );

  const socket = useBoardSocket(board.id, { onSync: handleSync, onConflict: handleConflict });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      const cardId = String(active.id);
      const toColumnId = String(over.id);
      const card = columns.flatMap((column) => column.cards).find((c) => c.id === cardId);
      if (!card || card.columnId === toColumnId) return;

      const targetColumn = columns.find((column) => column.id === toColumnId);
      const toPosition = targetColumn ? targetColumn.cards.length : 0;

      pendingSnapshots.current.set(cardId, columns);
      setColumns(moveCardOptimistically(columns, { cardId, toColumnId, toPosition }));

      const message: CardMoveMessage = {
        type: "card:move",
        cardId,
        toColumnId,
        toPosition,
        version: card.version,
      };
      socket.send(message);
    },
    [columns, socket],
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight">{board.name}</h1>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex flex-wrap items-start gap-4">
          {columns.map((column) => (
            <DroppableColumn key={column.id} id={column.id} name={column.name}>
              {column.cards.length === 0 ? (
                <p className="text-muted text-xs">No cards</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {column.cards.map((card) => (
                    <DraggableCard key={card.id} id={card.id} title={card.title} />
                  ))}
                </ul>
              )}
            </DroppableColumn>
          ))}
        </div>
      </DndContext>
    </div>
  );
}
