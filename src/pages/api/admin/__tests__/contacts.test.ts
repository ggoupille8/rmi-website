import { describe, it, expect, vi, beforeEach } from "vitest";

const mockedQuery = vi.hoisted(() => vi.fn());

vi.mock("@vercel/postgres", () => ({
  sql: {
    query: mockedQuery,
  },
}));

vi.mock("../../../../lib/db-env", () => ({
  getPostgresEnv: vi.fn(),
}));

vi.mock("../../../../lib/admin-auth", () => ({
  isAdminAuthorized: vi.fn(),
}));

vi.mock("../../../../lib/ensure-contacts-soft-delete", () => ({
  ensureContactsSoftDelete: vi.fn().mockResolvedValue(undefined),
}));

import { GET, PATCH } from "../contacts";
import { getPostgresEnv } from "../../../../lib/db-env";
import { isAdminAuthorized } from "../../../../lib/admin-auth";

const mockedGetPostgresEnv = vi.mocked(getPostgresEnv);
const mockedIsAdminAuthorized = vi.mocked(isAdminAuthorized);

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

function createPatchRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost:4321/api/admin/contacts", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
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
  mockedIsAdminAuthorized.mockReturnValue(true);
  mockedGetPostgresEnv.mockReturnValue({
    url: "postgres://test",
    source: "POSTGRES_URL",
  });
  mockedQuery.mockResolvedValue({
    rows: [],
    command: "",
    rowCount: 0,
    oid: 0,
    fields: [],
  });
}

describe("GET /api/admin/contacts", () => {
  beforeEach(() => {
    setupDefaults();
  });

  describe("authentication", () => {
    it("returns 401 when not authorized", async () => {
      mockedIsAdminAuthorized.mockReturnValue(false);
      const request = createRequest();
      const { status, body } = await parseResponse(
        await GET(createContext(request))
      );
      expect(status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    });

    it("includes WWW-Authenticate header on 401", async () => {
      mockedIsAdminAuthorized.mockReturnValue(false);
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
      const request = createRequest();
      const { status, body } = await parseResponse(
        await GET(createContext(request))
      );
      expect(status).toBe(500);
      expect(body.error).toBe("Database not configured");
    });

    it("returns 500 on database query error", async () => {
      mockedQuery.mockRejectedValue(new Error("Query failed"));
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const request = createRequest();
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
        { id: "1", name: "John", email: "john@test.com", status: "new" },
        { id: "2", name: "Jane", email: "jane@test.com", status: "new" },
      ];

      // First call: data query, Second call: count query
      mockedQuery.mockResolvedValueOnce({
        rows: mockContacts,
        command: "",
        rowCount: 2,
        oid: 0,
        fields: [],
      });
      mockedQuery.mockResolvedValueOnce({
        rows: [{ total: "2" }],
        command: "",
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const request = createRequest();
      const { status, body } = await parseResponse(
        await GET(createContext(request))
      );
      expect(status).toBe(200);

      const contacts = body.contacts as unknown[];
      expect(contacts).toHaveLength(2);

      const pagination = body.pagination as Record<string, unknown>;
      expect(pagination.total).toBe(2);
      expect(pagination.limit).toBe(20);
      expect(pagination.offset).toBe(0);
      expect(pagination.hasMore).toBe(false);
    });

    it("respects custom limit and offset", async () => {
      mockedQuery.mockResolvedValueOnce({
        rows: [{ id: "3" }],
        command: "",
        rowCount: 1,
        oid: 0,
        fields: [],
      });
      mockedQuery.mockResolvedValueOnce({
        rows: [{ total: "100" }],
        command: "",
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const request = createRequest({ limit: "10", offset: "20" });
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
      mockedQuery.mockResolvedValueOnce({
        rows: [],
        command: "",
        rowCount: 0,
        oid: 0,
        fields: [],
      });
      mockedQuery.mockResolvedValueOnce({
        rows: [{ total: "0" }],
        command: "",
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const request = createRequest({ limit: "500" });
      const { body } = await parseResponse(
        await GET(createContext(request))
      );
      const pagination = body.pagination as Record<string, unknown>;
      expect(pagination.limit).toBe(100);
    });

    it("filters by status", async () => {
      mockedQuery.mockResolvedValueOnce({
        rows: [],
        command: "",
        rowCount: 0,
        oid: 0,
        fields: [],
      });
      mockedQuery.mockResolvedValueOnce({
        rows: [{ total: "0" }],
        command: "",
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const request = createRequest({ status: "new" });
      const { status } = await parseResponse(
        await GET(createContext(request))
      );
      expect(status).toBe(200);
    });
  });

  describe("security headers", () => {
    it("includes Cache-Control: no-store on all responses", async () => {
      mockedIsAdminAuthorized.mockReturnValue(false);
      const request = createRequest();
      const response = await GET(createContext(request));
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    });

    it("includes X-Content-Type-Options on 401", async () => {
      mockedIsAdminAuthorized.mockReturnValue(false);
      const request = createRequest();
      const response = await GET(createContext(request));
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });
  });
});

describe("PATCH /api/admin/contacts", () => {
  beforeEach(() => {
    setupDefaults();
  });

  it("returns 401 when not authorized", async () => {
    mockedIsAdminAuthorized.mockReturnValue(false);
    const request = createPatchRequest({ id: "123", status: "contacted" });
    const { status } = await parseResponse(
      await PATCH(createContext(request))
    );
    expect(status).toBe(401);
  });

  it("returns 400 when no ID provided", async () => {
    const request = createPatchRequest({ status: "contacted" });
    const { status, body } = await parseResponse(
      await PATCH(createContext(request))
    );
    expect(status).toBe(400);
    expect(body.error).toBe("Contact ID is required");
  });

  it("returns 400 for invalid status", async () => {
    const request = createPatchRequest({
      id: "550e8400-e29b-41d4-a716-446655440000",
      status: "invalid",
    });
    const { status } = await parseResponse(
      await PATCH(createContext(request))
    );
    expect(status).toBe(400);
  });

  it("returns 404 when contact not found", async () => {
    mockedQuery.mockResolvedValueOnce({
      rows: [],
      command: "",
      rowCount: 0,
      oid: 0,
      fields: [],
    });

    const request = createPatchRequest({
      id: "550e8400-e29b-41d4-a716-446655440000",
      status: "contacted",
    });
    const { status } = await parseResponse(
      await PATCH(createContext(request))
    );
    expect(status).toBe(404);
  });

  it("updates status successfully", async () => {
    mockedQuery.mockResolvedValueOnce({
      rows: [
        {
          id: "550e8400-e29b-41d4-a716-446655440000",
          status: "contacted",
          notes: null,
          updated_at: "2026-03-05T00:00:00Z",
        },
      ],
      command: "",
      rowCount: 1,
      oid: 0,
      fields: [],
    });

    const request = createPatchRequest({
      id: "550e8400-e29b-41d4-a716-446655440000",
      status: "contacted",
    });
    const { status, body } = await parseResponse(
      await PATCH(createContext(request))
    );
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
  });
});
