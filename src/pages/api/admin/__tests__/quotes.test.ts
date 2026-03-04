import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@vercel/postgres", () => ({
  sql: vi.fn(),
}));

vi.mock("../../../../lib/db-env", () => ({
  getPostgresEnv: vi.fn(),
}));

import { GET } from "../quotes";
import { sql } from "@vercel/postgres";
import { getPostgresEnv } from "../../../../lib/db-env";

const mockedSql = vi.mocked(sql);
const mockedGetPostgresEnv = vi.mocked(getPostgresEnv);

const ADMIN_KEY = "test-admin-secret-key";

function createRequest(
  params?: Record<string, string>,
  authHeader?: string
): Request {
  const url = new URL("http://localhost:4321/api/admin/quotes");
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

describe("GET /api/admin/quotes", () => {
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

    it("returns 401 for invalid token", async () => {
      const request = createRequest({}, "Bearer wrong-key");
      const { status } = await parseResponse(
        await GET(createContext(request))
      );
      expect(status).toBe(401);
    });

    it("returns 401 when ADMIN_API_KEY is not set", async () => {
      vi.stubEnv("ADMIN_API_KEY", "");
      const request = createRequest({}, `Bearer ${ADMIN_KEY}`);
      const { status } = await parseResponse(
        await GET(createContext(request))
      );
      expect(status).toBe(401);
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

    it("returns 500 on database error", async () => {
      mockedSql.mockRejectedValue(new Error("Connection lost"));
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
    it("returns quotes with default pagination", async () => {
      const mockQuotes = [
        {
          id: "1",
          name: "John",
          company: "ACME",
          service_type: "Pipe Insulation",
        },
      ];

      mockedSql.mockResolvedValueOnce({
        rows: mockQuotes,
        command: "",
        rowCount: 1,
        oid: 0,
        fields: [],
      });
      mockedSql.mockResolvedValueOnce({
        rows: [{ total: "1" }],
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

      const quotes = body.quotes as unknown[];
      expect(quotes).toHaveLength(1);

      const pagination = body.pagination as Record<string, unknown>;
      expect(pagination.total).toBe(1);
      expect(pagination.limit).toBe(50);
      expect(pagination.offset).toBe(0);
      expect(pagination.hasMore).toBe(false);
    });

    it("filters by serviceType", async () => {
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
        { serviceType: "Pipe Insulation" },
        `Bearer ${ADMIN_KEY}`
      );
      const { status } = await parseResponse(
        await GET(createContext(request))
      );
      expect(status).toBe(200);
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
        { limit: "200" },
        `Bearer ${ADMIN_KEY}`
      );
      const { body } = await parseResponse(
        await GET(createContext(request))
      );
      const pagination = body.pagination as Record<string, unknown>;
      expect(pagination.limit).toBe(100);
    });

    it("calculates hasMore correctly", async () => {
      mockedSql.mockResolvedValueOnce({
        rows: [{ id: "1" }],
        command: "",
        rowCount: 1,
        oid: 0,
        fields: [],
      });
      mockedSql.mockResolvedValueOnce({
        rows: [{ total: "50" }],
        command: "",
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const request = createRequest(
        { limit: "10", offset: "30" },
        `Bearer ${ADMIN_KEY}`
      );
      const { body } = await parseResponse(
        await GET(createContext(request))
      );
      const pagination = body.pagination as Record<string, unknown>;
      expect(pagination.hasMore).toBe(true);
    });
  });
});
