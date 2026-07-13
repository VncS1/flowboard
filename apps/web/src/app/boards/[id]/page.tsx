"use client";

import { notFound, useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BoardDetail } from "@/components/BoardDetail";
import { Header } from "@/components/Header";
import { getBoard, getCurrentUser, type BoardResult, type CurrentUserResult } from "@/lib/api";

export default function BoardPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [boardResult, setBoardResult] = useState<BoardResult | null>(null);
  const [userResult, setUserResult] = useState<CurrentUserResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const board = await getBoard(id);
      if (cancelled) return;

      if (board.status === "unauthenticated") {
        router.replace("/login");
        return;
      }
      if (board.status === "not-found") {
        notFound();
        return;
      }

      setBoardResult(board);
      setUserResult(await getCurrentUser());
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [id, router]);

  if (!boardResult || boardResult.status !== "ok") {
    return null;
  }

  return (
    <>
      {userResult?.status === "ok" ? (
        <Header user={userResult.user} boardName={boardResult.board.name} />
      ) : null}
      <main className="mx-auto max-w-4xl px-6 py-16">
        <BoardDetail
          board={boardResult.board}
          currentUserId={userResult?.status === "ok" ? userResult.user.id : undefined}
        />
      </main>
    </>
  );
}
