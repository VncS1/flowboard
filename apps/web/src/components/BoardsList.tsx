import Link from "next/link";

import type { BoardSummary } from "@/lib/api";

export function BoardsList({ boards }: { boards: BoardSummary[] }) {
  if (boards.length === 0) {
    return <p className="text-muted text-sm">No boards yet — create one to get started.</p>;
  }

  return (
    <ul className="divide-border divide-y">
      {boards.map((board) => (
        <li key={board.id} className="flex items-center justify-between py-4">
          <Link
            href={`/boards/${board.id}`}
            className="text-ink hover:text-primary text-base font-medium transition-colors"
          >
            {board.name}
          </Link>
          <span className="text-muted text-xs">{board.columns.length} columns</span>
        </li>
      ))}
    </ul>
  );
}
