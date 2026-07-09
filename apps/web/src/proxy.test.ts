// @vitest-environment node
import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { proxy } from "./proxy";

const SECRET = "test-jwt-secret";

beforeEach(() => {
  vi.stubEnv("JWT_SECRET", SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function signToken(secret: string, expiresInSeconds = 3600): Promise<string> {
  return new SignJWT({ sub: "user-1" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSeconds)
    .sign(new TextEncoder().encode(secret));
}

describe("proxy", () => {
  it("redirects to /login when there is no session cookie", async () => {
    const request = new NextRequest(new URL("http://localhost:3000/boards"));

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("redirects to /login when the session cookie fails verification", async () => {
    const badToken = await signToken("wrong-secret");
    const request = new NextRequest(new URL("http://localhost:3000/boards"), {
      headers: { cookie: `token=${badToken}` },
    });

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("redirects to /login when the session cookie is expired", async () => {
    const expiredToken = await signToken(SECRET, -60);
    const request = new NextRequest(new URL("http://localhost:3000/boards"), {
      headers: { cookie: `token=${expiredToken}` },
    });

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("allows the request through when the session cookie is valid", async () => {
    const goodToken = await signToken(SECRET);
    const request = new NextRequest(new URL("http://localhost:3000/boards"), {
      headers: { cookie: `token=${goodToken}` },
    });

    const response = await proxy(request);

    expect(response.headers.get("location")).toBeNull();
  });
});
