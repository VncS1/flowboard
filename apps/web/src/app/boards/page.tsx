import Link from "next/link";

import { BoardsList } from "@/components/BoardsList";
import { CreateBoardForm } from "@/components/CreateBoardForm";
import { Header } from "@/components/Header";
import { getBoards, getCurrentUser } from "@/lib/api";

export default async function BoardsPage() {
  const result = await getBoards();

  if (result.status === "unauthenticated") {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-muted text-sm">
          You need to{" "}
          <Link href="/login" className="text-primary hover:underline">
            sign in
          </Link>{" "}
          to see your boards.
        </p>
      </main>
    );
  }

  const userResult = await getCurrentUser();

  return (
    <>
      {userResult.status === "ok" ? <Header user={userResult.user} /> : null}
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="mb-8 text-xl font-semibold tracking-tight">Boards</h1>
        <div className="mb-8">
          <CreateBoardForm />
        </div>
        <BoardsList boards={result.boards} />
      </main>
    </>
  );
}
