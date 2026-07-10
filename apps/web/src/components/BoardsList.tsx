import Link from "next/link";

import type { BoardSummary } from "@/lib/api";

export function BoardsList({ boards }: { boards: BoardSummary[] }) {
  if (boards.length === 0) {
    return <p className="text-muted text-sm">No boards yet — create one to get started.</p>;
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {boards.map((board) => (
        <li key={board.id}>
          <Link
            href={`/boards/${board.id}`}
            className="border-border bg-surface hover:border-primary flex flex-col gap-2 rounded-xl border p-5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]"
          >
            <span className="text-ink text-base font-semibold">{board.name}</span>
            <span className="text-muted border-border bg-bg w-fit rounded-full border px-2 py-0.5 text-xs">
              {board.columns.length} columns
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
