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

import { MemberList } from "@/components/MemberList";
import { PencilIcon, TrashIcon } from "@/components/icons";
import type { BoardDetail as BoardDetailData } from "@/lib/api";
import { createCard, deleteBoard, deleteCard, renameBoard, updateCard } from "@/lib/boardActions";
import {
  addCardIfAbsent,
  moveCardOptimistically,
  nestCardsIntoColumns,
  removeCardIfPresent,
  updateCardIfPresent,
  type BoardColumns,
} from "@/lib/boardState";
import { useBoardSocket } from "@/lib/useBoardSocket";

function CardEditForm({
  card,
  onSaved,
  onCancel,
}: {
  card: Card;
  onSaved: (card: Card) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(card.title);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await updateCard(card.id, { title });

    setSubmitting(false);

    if (result.status === "error") {
      setError(result.message);
      return;
    }

    onSaved(result.card);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label htmlFor={`edit-card-${card.id}`} className="sr-only">
        Card title
      </label>
      <input
        id={`edit-card-${card.id}`}
        type="text"
        required
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        className="border-border bg-bg text-ink rounded-md border px-2 py-1 text-sm"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="border-border hover:bg-surface text-ink rounded-md border px-2 py-1 text-xs font-medium disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-muted hover:text-ink px-2 py-1 text-xs"
        >
          Cancel
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}
    </form>
  );
}

function CardItem({
  card,
  onUpdated,
  onDeleted,
}: {
  card: Card;
  onUpdated: (card: Card) => void;
  onDeleted: (cardId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  const [mode, setMode] = useState<"view" | "edit" | "confirmDelete">("view");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirmDelete() {
    setError(null);
    setSubmitting(true);

    const result = await deleteCard(card.id);

    setSubmitting(false);

    if (result.status === "error") {
      setError(result.message);
      return;
    }

    onDeleted(card.id);
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`bg-bg border-border group rounded-lg border px-3 py-2 text-sm shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)] ${
        isDragging ? "shadow-[var(--shadow-card-hover)] opacity-50" : ""
      }`}
    >
      {mode === "edit" ? (
        <CardEditForm
          card={card}
          onSaved={(updated) => {
            onUpdated(updated);
            setMode("view");
          }}
          onCancel={() => setMode("view")}
        />
      ) : (
        <div className="flex items-start justify-between gap-2">
          <span {...attributes} {...listeners} className="touch-none flex-1 cursor-grab">
            {card.title}
          </span>
          <div
            className={`flex shrink-0 items-center gap-2 ${
              mode === "confirmDelete"
                ? ""
                : "opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
            }`}
          >
            {mode === "confirmDelete" ? (
              <>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={submitting}
                  className="text-danger text-xs font-medium disabled:opacity-50"
                >
                  {submitting ? "Deleting…" : "Confirm delete"}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("view")}
                  className="text-muted hover:text-ink text-xs"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setMode("edit")}
                  aria-label="Edit"
                  className="text-muted hover:text-ink rounded p-1"
                >
                  <PencilIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setMode("confirmDelete")}
                  aria-label="Delete"
                  className="text-danger rounded p-1"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}
    </li>
  );
}

const COLUMN_DOT_CLASSES = ["bg-primary", "bg-accent-2", "bg-accent-3"];

function DroppableColumn({
  id,
  name,
  position,
  children,
}: {
  id: string;
  name: string;
  position: number;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const dotClass = COLUMN_DOT_CLASSES[position % COLUMN_DOT_CLASSES.length];

  return (
    <section
      ref={setNodeRef}
      className={`bg-surface w-72 shrink-0 rounded-xl border p-4 shadow-[var(--shadow-card)] ${
        isOver ? "border-primary" : "border-border"
      }`}
    >
      <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
        <span
          data-column-dot
          aria-hidden="true"
          className={`h-1.5 w-1.5 rounded-full ${dotClass}`}
        />
        {name}
      </h2>
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

function BoardNameControls({
  boardId,
  name,
  onRenamed,
}: {
  boardId: string;
  name: string;
  onRenamed: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(name);
          setError(null);
          setEditing(true);
        }}
        aria-label="Rename"
        className="text-muted hover:text-ink rounded p-1"
      >
        <PencilIcon className="h-4 w-4" />
      </button>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await renameBoard(boardId, value);

    setSubmitting(false);

    if (result.status === "error") {
      setError(result.message);
      return;
    }

    onRenamed(result.board.name);
    setEditing(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <label htmlFor="board-name-input" className="sr-only">
        Board name
      </label>
      <input
        id="board-name-input"
        type="text"
        required
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="border-border bg-bg text-ink rounded-md border px-2 py-1 text-sm"
      />
      <button
        type="submit"
        disabled={submitting}
        className="border-border hover:bg-surface text-ink rounded-md border px-2 py-1 text-xs font-medium disabled:opacity-50"
      >
        {submitting ? "Saving…" : "Save"}
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="text-muted hover:text-ink text-xs"
      >
        Cancel
      </button>
      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}
    </form>
  );
}

function DeleteBoardControls({ boardId }: { boardId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirmDelete() {
    setError(null);
    setSubmitting(true);

    const result = await deleteBoard(boardId);

    setSubmitting(false);

    if (result.status === "error") {
      setError(result.message);
      return;
    }

    router.push("/boards");
    router.refresh();
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => {
          setError(null);
          setConfirming(true);
        }}
        aria-label="Delete board"
        className="text-danger rounded p-1"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleConfirmDelete}
        disabled={submitting}
        className="text-danger text-xs font-medium disabled:opacity-50"
      >
        {submitting ? "Deleting…" : "Confirm delete"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-muted hover:text-ink text-xs"
      >
        Cancel
      </button>
      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function BoardDetail({
  board,
  currentUserId,
}: {
  board: BoardDetailData;
  currentUserId?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(board.name);
  const [columns, setColumns] = useState<BoardColumns>(board.columns);
  const pendingSnapshots = useRef(new Map<string, BoardColumns>());
  const isOwner = currentUserId === board.ownerId;

  const handleSync = useCallback((message: BoardSyncMessage) => {
    pendingSnapshots.current.clear();
    setName(message.board.name);
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

  const handleBoardDeleted = useCallback(() => {
    router.push("/boards");
  }, [router]);

  const socket = useBoardSocket(board.id, {
    onSync: handleSync,
    onConflict: handleConflict,
    onBoardDeleted: handleBoardDeleted,
  });

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

  const handleCardUpdated = useCallback((card: Card) => {
    setColumns((current) => updateCardIfPresent(current, card));
  }, []);

  const handleCardDeleted = useCallback((cardId: string) => {
    setColumns((current) => removeCardIfPresent(current, cardId));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{name}</h1>
          {isOwner ? (
            <>
              <BoardNameControls boardId={board.id} name={name} onRenamed={setName} />
              <DeleteBoardControls boardId={board.id} />
            </>
          ) : null}
        </div>
        <MemberList
          boardId={board.id}
          initialMembers={board.members}
          currentUserId={currentUserId}
          isOwner={isOwner}
        />
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex flex-wrap items-start gap-4">
          {columns.map((column) => (
            <DroppableColumn
              key={column.id}
              id={column.id}
              name={column.name}
              position={column.position}
            >
              {column.cards.length === 0 ? (
                <p className="text-muted text-xs">No cards</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {column.cards.map((card) => (
                    <CardItem
                      key={card.id}
                      card={card}
                      onUpdated={handleCardUpdated}
                      onDeleted={handleCardDeleted}
                    />
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
