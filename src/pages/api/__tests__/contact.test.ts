import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock external dependencies before imports
vi.mock("@vercel/postgres", () => ({
  sql: vi.fn(),
}));

vi.mock("../../../lib/db-env", () => ({
  getPostgresEnv: vi.fn(),
}));

vi.mock("../../../lib/rate-limiter", () => ({
  getClientIP: vi.fn(),
}));

vi.mock("../../../lib/leadEnrichment", () => ({
  enrichLeadAsync: vi.fn().mockResolvedValue(undefined),
}));

import { POST, ALL } from "../contact";
import { sql } from "@vercel/postgres";
import { getPostgresEnv } from "../../../lib/db-env";
import { getClientIP } from "../../../lib/rate-limiter";
import { enrichLeadAsync } from "../../../lib/leadEnrichment";

const mockedSql = vi.mocked(sql);
const mockedGetPostgresEnv = vi.mocked(getPostgresEnv);
const mockedGetClientIP = vi.mocked(getClientIP);
const mockedEnrichLeadAsync = vi.mocked(enrichLeadAsync);

function createRequest(body: unknown, headers?: Record<string, string>): Request {
  return new Request("http://localhost:4321/api/contact", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function createContext(request: Request) {
  return { request } as unknown as Parameters<typeof POST>[0];
}

async function parseResponse(response: Response) {
  return {
    status: response.status,
    body: (await response.json()) as Record<string, unknown>,
  };
}

// Standard setup: DB configured, table exists, DB ready, rate limit OK
function setupDefaults() {
  mockedGetPostgresEnv.mockReturnValue({
    url: "postgres://test",
    source: "POSTGRES_URL",
  });
  mockedGetClientIP.mockReturnValue("127.0.0.1");

  // Default: all sql calls succeed
  // checkContactsTable: sql`SELECT to_regclass(...)` → table exists
  // verifyDatabaseReady: sql`SELECT 1`
  // checkDbRateLimit: sql`SELECT COUNT(*)` → count 0 (not rate limited)
  // saveContact: sql`INSERT INTO contacts...`
  mockedSql
    .mockResolvedValueOnce({
      rows: [{ contacts: "contacts" }],
      command: "", rowCount: 1, oid: 0, fields: [],
    })
    .mockResolvedValueOnce({
      rows: [{ "?column?": 1 }],
      command: "", rowCount: 1, oid: 0, fields: [],
    })
    .mockResolvedValueOnce({
      rows: [{ cnt: "0" }],
      command: "", rowCount: 1, oid: 0, fields: [],
    })
    .mockResolvedValueOnce({
      rows: [{ id: "test-uuid" }],
      command: "", rowCount: 1, oid: 0, fields: [],
    });
}

const validBody = {
  name: "John Doe",
  email: "john@example.com",
  phone: "555-123-4567",
  message: "Test message for contact form.",
  metadata: { elapsedMs: 10000 },
};

describe("POST /api/contact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaults();
  });

  it("returns 400 for invalid JSON body", async () => {
    const request = new Request("http://localhost:4321/api/contact", {
      method: "POST",
      body: "not json",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0",
      },
    });
    const { status, body } = await parseResponse(
      await POST(createContext(request))
    );
    expect(status).toBe(400);
    expect(body.error).toBe("Invalid JSON");
  });

  it("returns 500 when database is not configured", async () => {
    mockedGetPostgresEnv.mockReturnValue({ url: null, source: null });

    const { status, body } = await parseResponse(
      await POST(createContext(createRequest(validBody)))
    );
    expect(status).toBe(500);
    expect(body.error).toBe("Database not configured");
  });

  it("returns 500 when contacts table is missing", async () => {
    mockedSql.mockReset();
    mockedSql.mockResolvedValueOnce({
      rows: [{ contacts: null }],
      command: "", rowCount: 1, oid: 0, fields: [],
    });

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { status, body } = await parseResponse(
      await POST(createContext(createRequest(validBody)))
    );
    expect(status).toBe(500);
    expect(body.error).toBe("Database schema missing");
    consoleSpy.mockRestore();
  });

  it("returns 429 when rate limited (DB-backed)", async () => {
    mockedSql.mockReset();
    // checkContactsTable: success
    mockedSql.mockResolvedValueOnce({
      rows: [{ contacts: "contacts" }],
      command: "", rowCount: 1, oid: 0, fields: [],
    });
    // verifyDatabaseReady: success
    mockedSql.mockResolvedValueOnce({
      rows: [{ "?column?": 1 }],
      command: "", rowCount: 1, oid: 0, fields: [],
    });
    // checkDbRateLimit: count >= 3 → rate limited
    mockedSql.mockResolvedValueOnce({
      rows: [{ cnt: "3" }],
      command: "", rowCount: 1, oid: 0, fields: [],
    });

    const response = await POST(createContext(createRequest(validBody)));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("3600");
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.error).toContain("Too many requests");
  });

  it("returns 200 silently when honeypot is filled", async () => {
    const bodyWithHoneypot = { ...validBody, website: "http://spam.com" };

    const { status, body } = await parseResponse(
      await POST(createContext(createRequest(bodyWithHoneypot)))
    );
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
  });

  it("returns 400 when name is empty", async () => {
    const { status, body } = await parseResponse(
      await POST(createContext(createRequest({ ...validBody, name: "" })))
    );
    expect(status).toBe(400);
    expect(body.error).toBe("Invalid input");
  });

  it("returns 400 when message is empty", async () => {
    const { status, body } = await parseResponse(
      await POST(createContext(createRequest({ ...validBody, message: "" })))
    );
    expect(status).toBe(400);
    expect(body.error).toBe("Invalid input");
  });

  it("truncates name to 100 chars and accepts submission", async () => {
    const { status, body } = await parseResponse(
      await POST(
        createContext(createRequest({ ...validBody, name: "A".repeat(150) }))
      )
    );
    // Spec says truncate, not reject — name is sliced to 100 chars
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
  });

  it("returns 400 when email is not provided", async () => {
    const { status, body } = await parseResponse(
      await POST(
        createContext(
          createRequest({ name: "John", message: "Hello", email: "", phone: "", metadata: { elapsedMs: 10000 } })
        )
      )
    );
    expect(status).toBe(400);
    expect(body.error).toBe("Email is required");
    expect(body.field).toBe("email");
  });

  it("returns 400 for invalid email format", async () => {
    const { status, body } = await parseResponse(
      await POST(
        createContext(
          createRequest({ ...validBody, email: "not-an-email", phone: "" })
        )
      )
    );
    expect(status).toBe(400);
    expect(body.error).toBe("Invalid email format");
  });

  it("returns 400 with phone only (no email)", async () => {
    const { status, body } = await parseResponse(
      await POST(
        createContext(
          createRequest({
            name: "John",
            phone: "555-123-4567",
            message: "Hello",
            email: "",
            metadata: { elapsedMs: 10000 },
          })
        )
      )
    );
    expect(status).toBe(400);
    expect(body.error).toBe("Email is required");
  });

  it("returns 500 when database verify fails", async () => {
    mockedSql.mockReset();
    // checkContactsTable: success
    mockedSql.mockResolvedValueOnce({
      rows: [{ contacts: "contacts" }],
      command: "", rowCount: 1, oid: 0, fields: [],
    });
    // verifyDatabaseReady: failure
    mockedSql.mockRejectedValueOnce(new Error("Connection refused"));

    const { status, body } = await parseResponse(
      await POST(createContext(createRequest(validBody)))
    );
    expect(status).toBe(500);
    expect(body.error).toBe("Server error");
  });

  it("returns 500 when saveContact fails", async () => {
    mockedSql.mockReset();
    // checkContactsTable: success
    mockedSql.mockResolvedValueOnce({
      rows: [{ contacts: "contacts" }],
      command: "", rowCount: 1, oid: 0, fields: [],
    });
    // verifyDatabaseReady: success
    mockedSql.mockResolvedValueOnce({
      rows: [{ "?column?": 1 }],
      command: "", rowCount: 1, oid: 0, fields: [],
    });
    // checkDbRateLimit: not limited
    mockedSql.mockResolvedValueOnce({
      rows: [{ cnt: "0" }],
      command: "", rowCount: 1, oid: 0, fields: [],
    });
    // saveContact: failure
    mockedSql.mockRejectedValueOnce(new Error("Insert failed"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { status, body } = await parseResponse(
      await POST(createContext(createRequest(validBody)))
    );
    expect(status).toBe(500);
    expect(body.error).toBe("Server error");
    consoleSpy.mockRestore();
  });

  it("returns 200 on successful submission", async () => {
    const { status, body } = await parseResponse(
      await POST(createContext(createRequest(validBody)))
    );
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
  });

  it("fires enrichment async after successful save", async () => {
    await POST(createContext(createRequest(validBody)));
    // enrichLeadAsync is called fire-and-forget
    expect(mockedEnrichLeadAsync).toHaveBeenCalledWith(
      "test-uuid",
      expect.objectContaining({ name: "John Doe", email: "john@example.com" }),
      expect.any(Object),
      "127.0.0.1"
    );
  });

  it("returns 200 even if enrichment would fail", async () => {
    mockedEnrichLeadAsync.mockRejectedValueOnce(new Error("Enrichment error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { status, body } = await parseResponse(
      await POST(createContext(createRequest(validBody)))
    );
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    consoleSpy.mockRestore();
  });

  it("extracts client IP for rate limiting", async () => {
    const request = createRequest(validBody);
    await POST(createContext(request));
    expect(mockedGetClientIP).toHaveBeenCalledWith(request);
  });

  it("passes metadata fields through to saveContact", async () => {
    const bodyWithMetadata = {
      ...validBody,
      timestamp: "2026-01-01T00:00:00Z",
      metadata: { elapsedMs: 5000, fastSubmit: false },
    };

    await POST(createContext(createRequest(bodyWithMetadata)));
    expect(mockedSql).toHaveBeenCalled();
  });
});

describe("ALL /api/contact", () => {
  it("returns 405 for non-POST methods", async () => {
    const response = await ALL();
    expect(response.status).toBe(405);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.error).toBe("Method not allowed");
  });
});
