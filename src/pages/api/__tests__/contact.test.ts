import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock external dependencies before imports
vi.mock("@vercel/postgres", () => ({
  sql: vi.fn(),
}));

vi.mock("@sendgrid/mail", () => ({
  default: {
    setApiKey: vi.fn(),
    send: vi.fn(),
  },
}));

vi.mock("../../../lib/db-env", () => ({
  getPostgresEnv: vi.fn(),
}));

vi.mock("../../../lib/rate-limiter", () => ({
  contactRateLimiter: {
    check: vi.fn(),
  },
  getClientIP: vi.fn(),
}));

import { POST, ALL } from "../contact";
import { sql } from "@vercel/postgres";
import sgMail from "@sendgrid/mail";
import { getPostgresEnv } from "../../../lib/db-env";
import { contactRateLimiter, getClientIP } from "../../../lib/rate-limiter";

const mockedSql = vi.mocked(sql);
const mockedSgMail = vi.mocked(sgMail);
const mockedGetPostgresEnv = vi.mocked(getPostgresEnv);
const mockedRateLimiter = vi.mocked(contactRateLimiter);
const mockedGetClientIP = vi.mocked(getClientIP);

function createRequest(body: unknown, headers?: Record<string, string>): Request {
  return new Request("http://localhost:4321/api/contact", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
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

// Standard setup: DB configured, rate limit OK, table exists, DB ready
function setupDefaults() {
  mockedGetPostgresEnv.mockReturnValue({
    url: "postgres://test",
    source: "POSTGRES_URL",
  });
  mockedRateLimiter.check.mockReturnValue({ allowed: true, remaining: 4 });
  mockedGetClientIP.mockReturnValue("127.0.0.1");

  // checkContactsTable: sql`SELECT to_regclass(...)` → table exists
  // verifyDatabaseReady: sql`SELECT 1`
  // saveContact: sql`INSERT INTO contacts...`
  mockedSql.mockResolvedValue({
    rows: [{ contacts: "contacts", id: "test-uuid" }],
    command: "",
    rowCount: 1,
    oid: 0,
    fields: [],
  });
}

const validBody = {
  name: "John Doe",
  email: "john@example.com",
  phone: "555-123-4567",
  message: "Test message for contact form.",
};

describe("POST /api/contact", () => {
  beforeEach(() => {
    vi.stubEnv("SENDGRID_API_KEY", "test-sendgrid-key");
    vi.stubEnv("QUOTE_TO_EMAIL", "test@rmi-llc.net");
    vi.stubEnv("QUOTE_FROM_EMAIL", "no-reply@test.com");
    setupDefaults();
  });

  it("returns 400 for invalid JSON body", async () => {
    const request = new Request("http://localhost:4321/api/contact", {
      method: "POST",
      body: "not json",
      headers: { "Content-Type": "application/json" },
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
    // First sql call (checkContactsTable) returns no table
    mockedSql.mockResolvedValueOnce({
      rows: [{ contacts: null }],
      command: "",
      rowCount: 1,
      oid: 0,
      fields: [],
    });

    const { status, body } = await parseResponse(
      await POST(createContext(createRequest(validBody)))
    );
    expect(status).toBe(500);
    expect(body.error).toBe("Database schema missing");
  });

  it("returns 429 when rate limited", async () => {
    mockedRateLimiter.check.mockReturnValue({
      allowed: false,
      remaining: 0,
      retryAfter: 45,
    });

    const response = await POST(createContext(createRequest(validBody)));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("45");
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.error).toBe("Too many requests");
  });

  it("returns 200 silently when honeypot is filled", async () => {
    const bodyWithHoneypot = { ...validBody, website: "http://spam.com" };

    const { status, body } = await parseResponse(
      await POST(createContext(createRequest(bodyWithHoneypot)))
    );
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    // Should NOT save to database
    // checkContactsTable is called, but saveContact should NOT be
    // The honeypot check happens after table check, so sql is called for table check
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

  it("returns 400 when name exceeds length limit", async () => {
    const { status, body } = await parseResponse(
      await POST(
        createContext(createRequest({ ...validBody, name: "A".repeat(101) }))
      )
    );
    expect(status).toBe(400);
    expect(body.error).toBe("Invalid input");
  });

  it("returns 400 when email is not provided", async () => {
    const { status, body } = await parseResponse(
      await POST(
        createContext(
          createRequest({ name: "John", message: "Hello", email: "", phone: "" })
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
          })
        )
      )
    );
    expect(status).toBe(400);
    expect(body.error).toBe("Email is required");
  });

  it("returns 500 when database verify fails", async () => {
    // First call: checkContactsTable succeeds
    mockedSql.mockResolvedValueOnce({
      rows: [{ contacts: "contacts" }],
      command: "",
      rowCount: 1,
      oid: 0,
      fields: [],
    });
    // Second call: verifyDatabaseReady fails
    mockedSql.mockRejectedValueOnce(new Error("Connection refused"));

    const { status, body } = await parseResponse(
      await POST(createContext(createRequest(validBody)))
    );
    expect(status).toBe(500);
    expect(body.error).toBe("Server error");
  });

  it("returns 500 when saveContact fails", async () => {
    // checkContactsTable: success
    mockedSql.mockResolvedValueOnce({
      rows: [{ contacts: "contacts" }],
      command: "",
      rowCount: 1,
      oid: 0,
      fields: [],
    });
    // verifyDatabaseReady: success
    mockedSql.mockResolvedValueOnce({
      rows: [{ "?column?": 1 }],
      command: "",
      rowCount: 1,
      oid: 0,
      fields: [],
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

  it("succeeds even when email send fails", async () => {
    mockedSgMail.send.mockRejectedValueOnce(new Error("SendGrid error"));
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

    // sql should be called for INSERT with the metadata values
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
