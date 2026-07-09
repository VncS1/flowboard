import type { BoardDetail as BoardDetailData } from "@/lib/api";

export function BoardDetail({ board }: { board: BoardDetailData }) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight">{board.name}</h1>
      <div className="flex flex-wrap items-start gap-4">
        {board.columns.map((column) => (
          <section
            key={column.id}
            className="bg-surface border-border w-72 shrink-0 rounded-md border p-4"
          >
            <h2 className="mb-3 text-sm font-medium">{column.name}</h2>
            {column.cards.length === 0 ? (
              <p className="text-muted text-xs">No cards</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {column.cards.map((card) => (
                  <li
                    key={card.id}
                    className="bg-bg border-border rounded-md border px-3 py-2 text-sm"
                  >
                    {card.title}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
