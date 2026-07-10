"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, type FormEvent, type ReactNode } from "react";

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

import type {
  BoardSyncMessage,
  Card,
  CardConflictMessage,
  CardMoveMessage,
} from "@flowboard/shared";

import type { BoardDetail as BoardDetailData } from "@/lib/api";
import { createCard } from "@/lib/boardActions";
import {
  addCardIfAbsent,
  moveCardOptimistically,
  nestCardsIntoColumns,
  type BoardColumns,
} from "@/lib/boardState";
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

function NewCardForm({
  boardId,
  columnId,
  onCreated,
}: {
  boardId: string;
  columnId: string;
  onCreated: (card: Card) => void;
}) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await createCard(boardId, columnId, title);

    setSubmitting(false);

    if (result.status === "error") {
      setError(result.message);
      return;
    }

    setTitle("");
    onCreated(result.card);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
      <label htmlFor={`new-card-${columnId}`} className="sr-only">
        New card title
      </label>
      <input
        id={`new-card-${columnId}`}
        type="text"
        required
        placeholder="New card title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        className="border-border bg-bg text-ink rounded-md border px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={submitting}
        className="border-border hover:bg-surface text-ink rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-50"
      >
        {submitting ? "Adding…" : "Add card"}
      </button>
      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}
    </form>
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

  const handleCardCreated = useCallback((card: Card) => {
    setColumns((current) => addCardIfAbsent(current, card));
  }, []);

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
              <NewCardForm boardId={board.id} columnId={column.id} onCreated={handleCardCreated} />
            </DroppableColumn>
          ))}
        </div>
      </DndContext>
    </div>
  );
}
