import type { Board, Card, Column } from "@flowboard/shared";

const API_BASE = "/api";

export type BoardSummary = Board & { columns: Column[] };
export type ColumnWithCards = Column & { cards: Card[] };
export type BoardMemberSummary = {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "MEMBER";
};
export type BoardDetail = Board & { columns: ColumnWithCards[]; members: BoardMemberSummary[] };

export type BoardsResult = { status: "ok"; boards: BoardSummary[] } | { status: "unauthenticated" };

export type BoardResult =
  { status: "ok"; board: BoardDetail } | { status: "unauthenticated" } | { status: "not-found" };

export type CurrentUser = { id: string; email: string; name: string };

export type CurrentUserResult = { status: "ok"; user: CurrentUser } | { status: "unauthenticated" };

export async function getBoards(): Promise<BoardsResult> {
  const response = await fetch(`${API_BASE}/boards`, {
    credentials: "include",
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
  const response = await fetch(`${API_BASE}/boards/${id}`, {
    credentials: "include",
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

export async function getCurrentUser(): Promise<CurrentUserResult> {
  const response = await fetch(`${API_BASE}/auth/me`, {
    credentials: "include",
    cache: "no-store",
  });

  if (response.status === 401) {
    return { status: "unauthenticated" };
  }
  if (!response.ok) {
    throw new Error(`Failed to load current user: ${response.status}`);
  }

  const data = (await response.json()) as { user: CurrentUser };
  return { status: "ok", user: data.user };
}
