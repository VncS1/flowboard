"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { createBoard } from "@/lib/boardActions";

export function CreateBoardForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await createBoard(name);

    setSubmitting(false);

    if (result.status === "error") {
      setError(result.message);
      return;
    }

    router.push(`/boards/${result.board.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="flex flex-1 flex-col gap-1">
        <label htmlFor="board-name" className="text-sm font-medium">
          Board name
        </label>
        <input
          id="board-name"
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="border-border bg-bg text-ink rounded-md border px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="bg-primary hover:bg-primary-hover text-on-primary rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {submitting ? "Creating…" : "Create board"}
      </button>
      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}
    </form>
  );
}
