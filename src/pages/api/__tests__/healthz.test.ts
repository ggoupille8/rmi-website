import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../healthz";

function createContext() {
  const request = new Request("http://localhost:4321/api/healthz");
  return { request } as unknown as Parameters<typeof GET>[0];
}

async function parseResponse(response: Response) {
  return {
    status: response.status,
    body: (await response.json()) as Record<string, unknown>,
    headers: response.headers,
  };
}

describe("GET /api/healthz", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 200 status", async () => {
    const { status } = await parseResponse(await GET(createContext()));
    expect(status).toBe(200);
  });

  it("returns JSON content type", async () => {
    const response = await GET(createContext());
    expect(response.headers.get("Content-Type")).toBe("application/json");
  });

  it("returns Cache-Control no-cache header", async () => {
    const response = await GET(createContext());
    expect(response.headers.get("Cache-Control")).toBe(
      "no-cache, no-store, must-revalidate"
    );
  });

  it("returns status ok", async () => {
    const { body } = await parseResponse(await GET(createContext()));
    expect(body.status).toBe("ok");
  });

  it("includes ISO timestamp", async () => {
    const { body } = await parseResponse(await GET(createContext()));
    expect(typeof body.timestamp).toBe("string");
    // Verify it parses as a valid date
    const date = new Date(body.timestamp as string);
    expect(date.getTime()).not.toBeNaN();
  });

  it("reports sendgrid as configured when key is set", async () => {
    vi.stubEnv("SENDGRID_API_KEY", "test-key");
    const { body } = await parseResponse(await GET(createContext()));
    const checks = body.checks as Record<string, string>;
    expect(checks.sendgrid).toBe("configured");
  });

  it("reports sendgrid as missing when key is not set", async () => {
    vi.stubEnv("SENDGRID_API_KEY", "");
    const { body } = await parseResponse(await GET(createContext()));
    const checks = body.checks as Record<string, string>;
    expect(checks.sendgrid).toBe("missing");
  });

  it("reports database as configured when POSTGRES_URL is set", async () => {
    vi.stubEnv("POSTGRES_URL", "postgres://test");
    const { body } = await parseResponse(await GET(createContext()));
    const checks = body.checks as Record<string, string>;
    expect(checks.database).toBe("configured");
  });

  it("reports database as missing when POSTGRES_URL is not set", async () => {
    vi.stubEnv("POSTGRES_URL", "");
    const { body } = await parseResponse(await GET(createContext()));
    const checks = body.checks as Record<string, string>;
    expect(checks.database).toBe("missing");
  });

  it("returns both checks in response", async () => {
    const { body } = await parseResponse(await GET(createContext()));
    const checks = body.checks as Record<string, string>;
    expect(checks).toHaveProperty("sendgrid");
    expect(checks).toHaveProperty("database");
  });
});
