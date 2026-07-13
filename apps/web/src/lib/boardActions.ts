import type { Board, Card } from "@flowboard/shared";

import type { BoardMemberSummary } from "@/lib/api";

const API_BASE = "/api";

export type CreateBoardResult =
  { status: "ok"; board: Board } | { status: "error"; message: string };
export type CreateCardResult = { status: "ok"; card: Card } | { status: "error"; message: string };

const ERROR_MESSAGES: Record<string, string> = {
  invalid_body: "Please check the information you entered.",
  not_found: "This column no longer exists. Please refresh and try again.",
  owner_only: "Only the board owner can do this.",
  user_not_found: "No account found with that email.",
  already_member: "That person is already a member of this board.",
};

async function messageForResponse(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return (body.error && ERROR_MESSAGES[body.error]) || fallback;
  } catch {
    return fallback;
  }
}

async function postJson<T>(
  path: string,
  payload: unknown,
  fallbackMessage: string,
  extract: (body: unknown) => T,
): Promise<{ status: "ok"; value: T } | { status: "error"; message: string }> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    return { status: "error", message: "Could not reach the server. Please try again." };
  }

  if (!response.ok) {
    return { status: "error", message: await messageForResponse(response, fallbackMessage) };
  }

  return { status: "ok", value: extract(await response.json()) };
}

async function patchJson<T>(
  path: string,
  payload: unknown,
  fallbackMessage: string,
  extract: (body: unknown) => T,
): Promise<{ status: "ok"; value: T } | { status: "error"; message: string }> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    return { status: "error", message: "Could not reach the server. Please try again." };
  }

  if (!response.ok) {
    return { status: "error", message: await messageForResponse(response, fallbackMessage) };
  }

  return { status: "ok", value: extract(await response.json()) };
}

async function deleteRequest(
  path: string,
  fallbackMessage: string,
): Promise<{ status: "ok" } | { status: "error"; message: string }> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { method: "DELETE", credentials: "include" });
  } catch {
    return { status: "error", message: "Could not reach the server. Please try again." };
  }

  if (!response.ok) {
    return { status: "error", message: await messageForResponse(response, fallbackMessage) };
  }

  return { status: "ok" };
}

export async function createBoard(name: string): Promise<CreateBoardResult> {
  const result = await postJson(
    "/boards",
    { name },
    "Could not create the board. Please try again.",
    (body) => (body as { board: Board }).board,
  );
  return result.status === "ok" ? { status: "ok", board: result.value } : result;
}

export async function createCard(
  boardId: string,
  columnId: string,
  title: string,
): Promise<CreateCardResult> {
  const result = await postJson(
    `/boards/${boardId}/columns/${columnId}/cards`,
    { title },
    "Could not create the card. Please try again.",
    (body) => (body as { card: Card }).card,
  );
  return result.status === "ok" ? { status: "ok", card: result.value } : result;
}

export type RenameBoardResult =
  { status: "ok"; board: Board } | { status: "error"; message: string };
export type UpdateCardResult = { status: "ok"; card: Card } | { status: "error"; message: string };
export type DeleteResult = { status: "ok" } | { status: "error"; message: string };

export async function renameBoard(boardId: string, name: string): Promise<RenameBoardResult> {
  const result = await patchJson(
    `/boards/${boardId}`,
    { name },
    "Could not rename the board. Please try again.",
    (body) => (body as { board: Board }).board,
  );
  return result.status === "ok" ? { status: "ok", board: result.value } : result;
}

export async function deleteBoard(boardId: string): Promise<DeleteResult> {
  return deleteRequest(`/boards/${boardId}`, "Could not delete the board. Please try again.");
}

export async function updateCard(
  cardId: string,
  changes: { title?: string; description?: string },
): Promise<UpdateCardResult> {
  const result = await patchJson(
    `/cards/${cardId}`,
    changes,
    "Could not update the card. Please try again.",
    (body) => (body as { card: Card }).card,
  );
  return result.status === "ok" ? { status: "ok", card: result.value } : result;
}

export async function deleteCard(cardId: string): Promise<DeleteResult> {
  return deleteRequest(`/cards/${cardId}`, "Could not delete the card. Please try again.");
}

export type InviteMemberResult =
  { status: "ok"; member: BoardMemberSummary } | { status: "error"; message: string };

export async function inviteMember(boardId: string, email: string): Promise<InviteMemberResult> {
  const result = await postJson(
    `/boards/${boardId}/members`,
    { email },
    "Could not invite that member. Please try again.",
    (body) => {
      const member = (
        body as { member: { userId: string; name: string; email: string; role: "MEMBER" } }
      ).member;
      const summary: BoardMemberSummary = {
        id: member.userId,
        name: member.name,
        email: member.email,
        role: member.role,
      };
      return summary;
    },
  );
  return result.status === "ok" ? { status: "ok", member: result.value } : result;
}

export async function removeMember(boardId: string, userId: string): Promise<DeleteResult> {
  return deleteRequest(
    `/boards/${boardId}/members/${userId}`,
    "Could not remove that member. Please try again.",
  );
}
