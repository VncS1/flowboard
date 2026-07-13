const API_BASE = "/api";

export type AuthResult = { status: "ok" } | { status: "error"; message: string };

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "Incorrect email or password.",
  email_taken: "An account with that email already exists.",
  invalid_body: "Please check the information you entered.",
};

async function messageForResponse(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return (body.error && ERROR_MESSAGES[body.error]) || fallback;
  } catch {
    return fallback;
  }
}

async function postJson(
  path: string,
  payload: unknown,
  fallbackMessage: string,
): Promise<AuthResult> {
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

  return { status: "ok" };
}

export async function login(email: string, password: string): Promise<AuthResult> {
  return postJson("/auth/login", { email, password }, "Could not sign in. Please try again.");
}

export async function signup(email: string, name: string, password: string): Promise<AuthResult> {
  return postJson(
    "/auth/signup",
    { email, name, password },
    "Could not create your account. Please try again.",
  );
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
}
