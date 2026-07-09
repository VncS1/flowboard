import Link from "next/link";
import { notFound } from "next/navigation";

import { BoardDetail } from "@/components/BoardDetail";
import { getBoard } from "@/lib/api";

export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getBoard(id);

  if (result.status === "not-found") {
    notFound();
  }

  if (result.status === "unauthenticated") {
    return (
      <main className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-muted text-sm">
          You need to{" "}
          <Link href="/login" className="text-primary hover:underline">
            sign in
          </Link>{" "}
          to see this board.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <BoardDetail board={result.board} />
    </main>
  );
}
