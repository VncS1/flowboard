import { describe, expect, it } from "vitest";

import { buildApp } from "./app.js";

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const app = buildApp();

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });

    await app.close();
  });
});

describe("CORS", () => {
  it("allows the configured frontend origin to make credentialed requests", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "OPTIONS",
      url: "/auth/login",
      headers: {
        origin: "http://localhost:3000",
        "access-control-request-method": "POST",
      },
    });

    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    expect(response.headers["access-control-allow-credentials"]).toBe("true");

    await app.close();
  });

  it("does not allow an unrecognized origin", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "OPTIONS",
      url: "/auth/login",
      headers: {
        origin: "http://evil.example.com",
        "access-control-request-method": "POST",
      },
    });

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();

    await app.close();
  });

  it("allows PATCH and DELETE preflight requests, used by board/card/member mutation routes", async () => {
    const app = buildApp();

    const patchResponse = await app.inject({
      method: "OPTIONS",
      url: "/boards/some-id",
      headers: {
        origin: "http://localhost:3000",
        "access-control-request-method": "PATCH",
      },
    });
    expect(patchResponse.headers["access-control-allow-methods"]).toContain("PATCH");

    const deleteResponse = await app.inject({
      method: "OPTIONS",
      url: "/boards/some-id",
      headers: {
        origin: "http://localhost:3000",
        "access-control-request-method": "DELETE",
      },
    });
    expect(deleteResponse.headers["access-control-allow-methods"]).toContain("DELETE");

    await app.close();
  });
});
