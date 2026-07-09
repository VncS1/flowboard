import type { Board, Card } from "@flowboard/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type CreateBoardResult =
  { status: "ok"; board: Board } | { status: "error"; message: string };
export type CreateCardResult = { status: "ok"; card: Card } | { status: "error"; message: string };

const ERROR_MESSAGES: Record<string, string> = {
  invalid_body: "Please check the information you entered.",
  not_found: "This column no longer exists. Please refresh and try again.",
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
    response = await fetch(`${API_URL}${path}`, {
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
