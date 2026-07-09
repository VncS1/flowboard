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

export function moveCardOptimistically(
  columns: BoardColumns,
  input: { cardId: string; toColumnId: string; toPosition: number },
): BoardColumns {
  const card = findCard(columns, input.cardId);
  if (!card) return columns;

  const movedCard: Card = { ...card, columnId: input.toColumnId, position: input.toPosition };

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
