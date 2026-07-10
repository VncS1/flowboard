import type { Card, Column } from "@flowboard/shared";

import type { ColumnWithCards } from "@/lib/api";

export type BoardColumns = ColumnWithCards[];

export function nestCardsIntoColumns(columns: Column[], cards: Card[]): BoardColumns {
  const sortedColumns = [...columns].sort((a, b) => a.position - b.position);

  return sortedColumns.map((column) => ({
    ...column,
    cards: cards
      .filter((card) => card.columnId === column.id)
      .sort((a, b) => a.position - b.position),
  }));
}

function findCard(columns: BoardColumns, cardId: string): Card | undefined {
  for (const column of columns) {
    const card = column.cards.find((c) => c.id === cardId);
    if (card) return card;
  }
  return undefined;
}

/** Appends `card` to its column, unless a card with the same id is already present.
 * Needed because a REST create's board:sync broadcast can reach this client's own
 * socket before the create's HTTP response resolves, so the caller's optimistic
 * append must tolerate the card having already arrived via sync. */
export function addCardIfAbsent(columns: BoardColumns, card: Card): BoardColumns {
  if (findCard(columns, card.id)) return columns;

  return columns.map((column) =>
    column.id === card.columnId ? { ...column, cards: [...column.cards, card] } : column,
  );
}

export function moveCardOptimistically(
  columns: BoardColumns,
  input: { cardId: string; toColumnId: string; toPosition: number },
): BoardColumns {
  const card = findCard(columns, input.cardId);
  if (!card) return columns;

  const movedCard: Card = {
    ...card,
    columnId: input.toColumnId,
    position: input.toPosition,
    version: card.version + 1,
  };

  return columns.map((column) => {
    const cardsWithoutMoved = column.cards.filter((c) => c.id !== input.cardId);

    if (column.id !== input.toColumnId) {
      return { ...column, cards: cardsWithoutMoved };
    }

    const cards = [...cardsWithoutMoved];
    const insertAt = Math.min(input.toPosition, cards.length);
    cards.splice(insertAt, 0, movedCard);
    return { ...column, cards };
  });
}
