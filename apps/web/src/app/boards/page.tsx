"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BoardsList } from "@/components/BoardsList";
import { CreateBoardForm } from "@/components/CreateBoardForm";
import { Header } from "@/components/Header";
import { getBoards, getCurrentUser, type BoardsResult, type CurrentUserResult } from "@/lib/api";

export default function BoardsPage() {
  const router = useRouter();
  const [boardsResult, setBoardsResult] = useState<BoardsResult | null>(null);
  const [userResult, setUserResult] = useState<CurrentUserResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const boards = await getBoards();
      if (cancelled) return;

      if (boards.status === "unauthenticated") {
        router.replace("/login");
        return;
      }

      setBoardsResult(boards);
      setUserResult(await getCurrentUser());
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!boardsResult || boardsResult.status !== "ok") {
    return null;
  }

  return (
    <>
      {userResult?.status === "ok" ? <Header user={userResult.user} /> : null}
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="mb-8 text-xl font-semibold tracking-tight">Boards</h1>
        <div className="mb-8">
          <CreateBoardForm />
        </div>
        <BoardsList boards={boardsResult.boards} />
      </main>
    </>
  );
}
