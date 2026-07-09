import { cookies } from "next/headers";

import type { Board, Card, Column } from "@flowboard/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type BoardSummary = Board & { columns: Column[] };
export type ColumnWithCards = Column & { cards: Card[] };
export type BoardDetail = Board & { columns: ColumnWithCards[] };

export type BoardsResult = { status: "ok"; boards: BoardSummary[] } | { status: "unauthenticated" };

export type BoardResult =
  { status: "ok"; board: BoardDetail } | { status: "unauthenticated" } | { status: "not-found" };

async function authHeaders(): Promise<Record<string, string>> {
  const store = await cookies();
  const token = store.get("token")?.value;
  return token ? { cookie: `token=${token}` } : {};
}

export async function getBoards(): Promise<BoardsResult> {
  const response = await fetch(`${API_URL}/boards`, {
    headers: await authHeaders(),
    cache: "no-store",
  });

  if (response.status === 401) {
    return { status: "unauthenticated" };
  }
  if (!response.ok) {
    throw new Error(`Failed to load boards: ${response.status}`);
  }

  const data = (await response.json()) as { boards: BoardSummary[] };
  return { status: "ok", boards: data.boards };
}

export async function getBoard(id: string): Promise<BoardResult> {
  const response = await fetch(`${API_URL}/boards/${id}`, {
    headers: await authHeaders(),
    cache: "no-store",
  });

  if (response.status === 401) {
    return { status: "unauthenticated" };
  }
  if (response.status === 404) {
    return { status: "not-found" };
  }
  if (!response.ok) {
    throw new Error(`Failed to load board: ${response.status}`);
  }

  const data = (await response.json()) as { board: BoardDetail };
  return { status: "ok", board: data.board };
}
