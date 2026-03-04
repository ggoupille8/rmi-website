import { describe, it, expect, vi, beforeEach } from "vitest";

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
  quoteRateLimiter: {
    check: vi.fn(),
  },
  getClientIP: vi.fn(),
}));

import { POST } from "../quote";
import { sql } from "@vercel/postgres";
import sgMail from "@sendgrid/mail";
import { getPostgresEnv } from "../../../lib/db-env";
import { quoteRateLimiter, getClientIP } from "../../../lib/rate-limiter";

const mockedSql = vi.mocked(sql);
const mockedSgMail = vi.mocked(sgMail);
const mockedGetPostgresEnv = vi.mocked(getPostgresEnv);
const mockedRateLimiter = vi.mocked(quoteRateLimiter);
const mockedGetClientIP = vi.mocked(getClientIP);

function createRequest(body: unknown): Request {
  return new Request("http://localhost:4321/api/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

function setupDefaults() {
  mockedGetPostgresEnv.mockReturnValue({
    url: "postgres://test",
    source: "POSTGRES_URL",
  });
  mockedRateLimiter.check.mockReturnValue({ allowed: true, remaining: 4 });
  mockedGetClientIP.mockReturnValue("127.0.0.1");
  mockedSql.mockResolvedValue({
    rows: [{ id: "quote-uuid" }],
    command: "",
    rowCount: 1,
    oid: 0,
    fields: [],
  });
}

const validBody = {
  name: "Jane Smith",
  company: "ACME Corp",
  email: "jane@acme.com",
  phone: "555-987-6543",
  message: "Need a quote for pipe insulation.",
  serviceType: "Pipe Insulation",
  timestamp: String(Date.now() - 5000),
};

describe("POST /api/quote", () => {
  beforeEach(() => {
    vi.stubEnv("SENDGRID_API_KEY", "test-sendgrid-key");
    vi.stubEnv("QUOTE_TO_EMAIL", "test@rmi-llc.net");
    vi.stubEnv("QUOTE_FROM_EMAIL", "no-reply@test.com");
    setupDefaults();
  });

  it("returns 429 when rate limited", async () => {
    mockedRateLimiter.check.mockReturnValue({
      allowed: false,
      remaining: 0,
      retryAfter: 900,
    });

    const response = await POST(createContext(createRequest(validBody)));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("900");
  });

  it("returns 400 for invalid JSON", async () => {
    const request = new Request("http://localhost:4321/api/quote", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });
    const { status, body } = await parseResponse(
      await POST(createContext(request))
    );
    expect(status).toBe(400);
    expect(body.error).toBe("Invalid JSON");
  });

  it("returns 400 when name is missing", async () => {
    const { status, body } = await parseResponse(
      await POST(createContext(createRequest({ ...validBody, name: "" })))
    );
    expect(status).toBe(400);
    expect(body.error).toBe("Name is required");
  });

  it("returns 400 when company is missing", async () => {
    const { status, body } = await parseResponse(
      await POST(createContext(createRequest({ ...validBody, company: "" })))
    );
    expect(status).toBe(400);
    expect(body.error).toBe("Company is required");
  });

  it("returns 400 when neither email nor phone provided", async () => {
    const { status, body } = await parseResponse(
      await POST(
        createContext(
          createRequest({
            ...validBody,
            email: undefined,
            phone: undefined,
          })
        )
      )
    );
    expect(status).toBe(400);
    expect(body.error).toBe("Email or phone is required");
  });

  it("returns 400 for invalid email format", async () => {
    const { status, body } = await parseResponse(
      await POST(
        createContext(
          createRequest({
            ...validBody,
            email: "not-an-email",
            phone: undefined,
          })
        )
      )
    );
    expect(status).toBe(400);
    expect(body.error).toBe("Invalid email format");
  });

  it("returns 400 for invalid phone format", async () => {
    const { status, body } = await parseResponse(
      await POST(
        createContext(
          createRequest({
            ...validBody,
            email: undefined,
            phone: "123",
          })
        )
      )
    );
    expect(status).toBe(400);
    expect(body.error).toBe("Invalid phone format");
  });

  it("returns 400 when message is missing", async () => {
    const { status, body } = await parseResponse(
      await POST(createContext(createRequest({ ...validBody, message: "" })))
    );
    expect(status).toBe(400);
    expect(body.error).toBe("Message is required");
  });

  it("returns 400 when serviceType is missing", async () => {
    const { status, body } = await parseResponse(
      await POST(
        createContext(createRequest({ ...validBody, serviceType: "" }))
      )
    );
    expect(status).toBe(400);
    expect(body.error).toBe("Service type is required");
  });

  it("returns 400 when honeypot is filled", async () => {
    const { status, body } = await parseResponse(
      await POST(
        createContext(
          createRequest({ ...validBody, honeypot: "spam content" })
        )
      )
    );
    expect(status).toBe(400);
    expect(body.error).toBe("Spam detected");
  });

  it("returns 400 when submission is too fast", async () => {
    const { status, body } = await parseResponse(
      await POST(
        createContext(
          createRequest({
            ...validBody,
            timestamp: String(Date.now() - 100), // 100ms ago
          })
        )
      )
    );
    expect(status).toBe(400);
    expect(body.error).toBe("Submission too fast");
  });

  it("returns 400 for invalid timestamp", async () => {
    const { status, body } = await parseResponse(
      await POST(
        createContext(
          createRequest({ ...validBody, timestamp: "not-a-number" })
        )
      )
    );
    expect(status).toBe(400);
    expect(body.error).toBe("Invalid timestamp");
  });

  it("returns 200 on successful submission (both save and email)", async () => {
    const { status, body } = await parseResponse(
      await POST(createContext(createRequest(validBody)))
    );
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.requestId).toBeDefined();
  });

  it("returns 200 when DB fails but email succeeds (best effort)", async () => {
    mockedSql.mockRejectedValue(new Error("DB down"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { status, body } = await parseResponse(
      await POST(createContext(createRequest(validBody)))
    );
    expect(status).toBe(200);
    expect(body.ok).toBe(true);

    consoleSpy.mockRestore();
  });

  it("returns 200 when email fails but DB succeeds (best effort)", async () => {
    mockedSgMail.send.mockRejectedValueOnce(new Error("SendGrid down"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { status, body } = await parseResponse(
      await POST(createContext(createRequest(validBody)))
    );
    expect(status).toBe(200);
    expect(body.ok).toBe(true);

    consoleSpy.mockRestore();
  });

  it("returns 500 when both DB and email fail", async () => {
    mockedSql.mockRejectedValue(new Error("DB down"));
    mockedSgMail.send.mockRejectedValueOnce(new Error("SendGrid down"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { status, body } = await parseResponse(
      await POST(createContext(createRequest(validBody)))
    );
    expect(status).toBe(500);
    expect(body.error).toBe("Server error");

    consoleSpy.mockRestore();
  });

  it("still tries email when database is not configured", async () => {
    mockedGetPostgresEnv.mockReturnValue({ url: null, source: null });
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { status, body } = await parseResponse(
      await POST(createContext(createRequest(validBody)))
    );
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mockedSgMail.send).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("accepts valid submission with phone only", async () => {
    const { status, body } = await parseResponse(
      await POST(
        createContext(
          createRequest({
            ...validBody,
            email: undefined,
            phone: "555-123-4567",
          })
        )
      )
    );
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
  });

  it("includes requestId in all responses", async () => {
    // Success
    const { body: successBody } = await parseResponse(
      await POST(createContext(createRequest(validBody)))
    );
    expect(successBody.requestId).toBeDefined();
    expect(typeof successBody.requestId).toBe("string");

    // Error
    const { body: errorBody } = await parseResponse(
      await POST(createContext(createRequest({ ...validBody, name: "" })))
    );
    expect(errorBody.requestId).toBeDefined();
  });
});
