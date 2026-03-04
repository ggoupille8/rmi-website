import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@vercel/postgres", () => ({
  sql: vi.fn(),
}));

vi.mock("../../../../lib/db-env", () => ({
  getPostgresEnv: vi.fn(),
}));

import { GET } from "../contacts";
import { sql } from "@vercel/postgres";
import { getPostgresEnv } from "../../../../lib/db-env";

const mockedSql = vi.mocked(sql);
const mockedGetPostgresEnv = vi.mocked(getPostgresEnv);

const ADMIN_KEY = "test-admin-secret-key";

function createRequest(
  params?: Record<string, string>,
  authHeader?: string
): Request {
  const url = new URL("http://localhost:4321/api/admin/contacts");
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  const headers: Record<string, string> = {};
  if (authHeader !== undefined) {
    headers["Authorization"] = authHeader;
  }
  return new Request(url.toString(), { headers });
}

function createContext(request: Request) {
  return { request } as unknown as Parameters<typeof GET>[0];
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
  mockedSql.mockResolvedValue({
    rows: [],
    command: "",
    rowCount: 0,
    oid: 0,
    fields: [],
  });
}

describe("GET /api/admin/contacts", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_API_KEY", ADMIN_KEY);
    setupDefaults();
  });

  describe("authentication", () => {
    it("returns 401 when no auth header is provided", async () => {
      const request = createRequest();
      const { status, body } = await parseResponse(
        await GET(createContext(request))
      );
      expect(status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    });

    it("returns 401 for invalid Bearer token", async () => {
      const request = createRequest({}, `Bearer wrong-key`);
      const { status } = await parseResponse(
        await GET(createContext(request))
      );
      expect(status).toBe(401);
    });

    it("returns 401 when ADMIN_API_KEY is not configured", async () => {
      vi.stubEnv("ADMIN_API_KEY", "");
      const request = createRequest({}, `Bearer ${ADMIN_KEY}`);
      const { status } = await parseResponse(
        await GET(createContext(request))
      );
      expect(status).toBe(401);
    });

    it("returns 401 for malformed auth header (no Bearer prefix)", async () => {
      const request = createRequest({}, ADMIN_KEY);
      const { status } = await parseResponse(
        await GET(createContext(request))
      );
      expect(status).toBe(401);
    });

    it("returns 401 for Bearer with extra whitespace", async () => {
      const request = createRequest({}, `Bearer  ${ADMIN_KEY}`);
      const { status } = await parseResponse(
        await GET(createContext(request))
      );
      expect(status).toBe(401);
    });

    it("includes WWW-Authenticate header on 401", async () => {
      const request = createRequest();
      const response = await GET(createContext(request));
      expect(response.headers.get("WWW-Authenticate")).toBe(
        'Bearer realm="admin"'
      );
    });
  });

  describe("database", () => {
    it("returns 500 when database is not configured", async () => {
      mockedGetPostgresEnv.mockReturnValue({ url: null, source: null });
      const request = createRequest({}, `Bearer ${ADMIN_KEY}`);
      const { status, body } = await parseResponse(
        await GET(createContext(request))
      );
      expect(status).toBe(500);
      expect(body.error).toBe("Database not configured");
    });

    it("returns 500 on database query error", async () => {
      mockedSql.mockRejectedValue(new Error("Query failed"));
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const request = createRequest({}, `Bearer ${ADMIN_KEY}`);
      const { status, body } = await parseResponse(
        await GET(createContext(request))
      );
      expect(status).toBe(500);
      expect(body.error).toBe("Internal server error");

      consoleSpy.mockRestore();
    });
  });

  describe("successful queries", () => {
    it("returns contacts with default pagination", async () => {
      const mockContacts = [
        { id: "1", name: "John", email: "john@test.com" },
        { id: "2", name: "Jane", email: "jane@test.com" },
      ];

      // First call: data query
      mockedSql.mockResolvedValueOnce({
        rows: mockContacts,
        command: "",
        rowCount: 2,
        oid: 0,
        fields: [],
      });
      // Second call: count query
      mockedSql.mockResolvedValueOnce({
        rows: [{ total: "2" }],
        command: "",
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const request = createRequest({}, `Bearer ${ADMIN_KEY}`);
      const { status, body } = await parseResponse(
        await GET(createContext(request))
      );
      expect(status).toBe(200);

      const contacts = body.contacts as unknown[];
      expect(contacts).toHaveLength(2);

      const pagination = body.pagination as Record<string, unknown>;
      expect(pagination.total).toBe(2);
      expect(pagination.limit).toBe(50);
      expect(pagination.offset).toBe(0);
      expect(pagination.hasMore).toBe(false);
    });

    it("respects custom limit and offset", async () => {
      mockedSql.mockResolvedValueOnce({
        rows: [{ id: "3" }],
        command: "",
        rowCount: 1,
        oid: 0,
        fields: [],
      });
      mockedSql.mockResolvedValueOnce({
        rows: [{ total: "100" }],
        command: "",
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const request = createRequest(
        { limit: "10", offset: "20" },
        `Bearer ${ADMIN_KEY}`
      );
      const { status, body } = await parseResponse(
        await GET(createContext(request))
      );
      expect(status).toBe(200);

      const pagination = body.pagination as Record<string, unknown>;
      expect(pagination.limit).toBe(10);
      expect(pagination.offset).toBe(20);
      expect(pagination.hasMore).toBe(true);
    });

    it("clamps limit to max 100", async () => {
      mockedSql.mockResolvedValueOnce({
        rows: [],
        command: "",
        rowCount: 0,
        oid: 0,
        fields: [],
      });
      mockedSql.mockResolvedValueOnce({
        rows: [{ total: "0" }],
        command: "",
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const request = createRequest(
        { limit: "500" },
        `Bearer ${ADMIN_KEY}`
      );
      const { body } = await parseResponse(
        await GET(createContext(request))
      );
      const pagination = body.pagination as Record<string, unknown>;
      expect(pagination.limit).toBe(100);
    });

    it("filters by source=contact", async () => {
      mockedSql.mockResolvedValueOnce({
        rows: [],
        command: "",
        rowCount: 0,
        oid: 0,
        fields: [],
      });
      mockedSql.mockResolvedValueOnce({
        rows: [{ total: "0" }],
        command: "",
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const request = createRequest(
        { source: "contact" },
        `Bearer ${ADMIN_KEY}`
      );
      const { status } = await parseResponse(
        await GET(createContext(request))
      );
      expect(status).toBe(200);
    });

    it("returns 400 for invalid source parameter", async () => {
      const request = createRequest(
        { source: "invalid" },
        `Bearer ${ADMIN_KEY}`
      );
      const { status, body } = await parseResponse(
        await GET(createContext(request))
      );
      expect(status).toBe(400);
      expect(body.error).toBe("Invalid input");
    });
  });

  describe("security headers", () => {
    it("includes Cache-Control: no-store on all responses", async () => {
      // 401 response
      const request = createRequest();
      const response = await GET(createContext(request));
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    });

    it("includes X-Content-Type-Options on 401", async () => {
      const request = createRequest();
      const response = await GET(createContext(request));
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });
  });
});
