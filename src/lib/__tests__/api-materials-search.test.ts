import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock external dependencies before imports
vi.mock('@vercel/postgres', () => ({
  sql: vi.fn(),
}));

vi.mock('../../lib/db-env', () => ({
  getPostgresEnv: vi.fn(),
}));

vi.mock('../../lib/admin-auth', () => ({
  isAdminAuthorized: vi.fn(),
}));

import { GET } from '../../pages/api/admin/materials-search';
import { sql } from '@vercel/postgres';
import { getPostgresEnv } from '../../lib/db-env';
import { isAdminAuthorized } from '../../lib/admin-auth';

const mockedSql = vi.mocked(sql);
const mockedGetPostgresEnv = vi.mocked(getPostgresEnv);
const mockedIsAdmin = vi.mocked(isAdminAuthorized);

const DB_RESULT = { command: '', rowCount: 1, oid: 0, fields: [] };

function createGetRequest(params: string): Request {
  return new Request(`http://localhost:4321/api/admin/materials-search?${params}`, {
    method: 'GET',
    headers: { Authorization: 'Bearer test-key' },
  });
}

function createContext(request: Request) {
  return { request } as unknown as Parameters<typeof GET>[0];
}

async function parseResponse(response: Response) {
  return { status: response.status, body: await response.json() as Record<string, unknown> };
}

describe('GET /api/admin/materials-search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetPostgresEnv.mockReturnValue({ url: 'postgres://test', source: 'POSTGRES_URL' });
    mockedIsAdmin.mockReturnValue(true);
  });

  it('returns 401 when not authorized', async () => {
    mockedIsAdmin.mockReturnValue(false);
    const { status } = await parseResponse(
      await GET(createContext(createGetRequest('q=fiberglass')))
    );
    expect(status).toBe(401);
  });

  it('returns 400 when query is missing', async () => {
    const { status, body } = await parseResponse(
      await GET(createContext(createGetRequest('')))
    );
    expect(status).toBe(400);
    expect(body.error).toContain("'q'");
  });

  it('returns 400 when query is empty string', async () => {
    const { status, body } = await parseResponse(
      await GET(createContext(createGetRequest('q=')))
    );
    expect(status).toBe(400);
    expect(body.error).toContain("'q'");
  });

  it('returns search results for single-word query', async () => {
    mockedSql.mockResolvedValueOnce({
      rows: [
        { id: 1, description: 'Fiberglass 1" Pipe Covering', unit: 'LF', taxCategory: 'installed', sort_rank: 1 },
        { id: 2, description: 'Fiberglass 2" Pipe Covering', unit: 'LF', taxCategory: 'installed', sort_rank: 1 },
      ],
      ...DB_RESULT,
    });

    const { status, body } = await parseResponse(
      await GET(createContext(createGetRequest('q=fiberglass')))
    );

    expect(status).toBe(200);
    const results = body.results as Array<Record<string, unknown>>;
    expect(results.length).toBe(2);
    expect(results[0]).toHaveProperty('id');
    expect(results[0]).toHaveProperty('description');
    expect(results[0]).toHaveProperty('taxCategory');
    // sort_rank should be stripped from response
    expect(results[0]).not.toHaveProperty('sort_rank');
  });

  it('returns results with taxCategory "consumable" for consumable items', async () => {
    mockedSql.mockResolvedValueOnce({
      rows: [
        { id: 50, description: 'Wire Brush 4"', unit: 'EA', taxCategory: 'consumable', sort_rank: 1 },
      ],
      ...DB_RESULT,
    });

    const { status, body } = await parseResponse(
      await GET(createContext(createGetRequest('q=brush')))
    );

    expect(status).toBe(200);
    const results = body.results as Array<Record<string, unknown>>;
    expect(results[0].taxCategory).toBe('consumable');
  });

  it('returns empty results when no matches', async () => {
    mockedSql.mockResolvedValueOnce({ rows: [], ...DB_RESULT });

    const { status, body } = await parseResponse(
      await GET(createContext(createGetRequest('q=xyznonexistent')))
    );

    expect(status).toBe(200);
    const results = body.results as Array<Record<string, unknown>>;
    expect(results.length).toBe(0);
  });

  it('handles multi-word query (AND matching)', async () => {
    mockedSql.mockResolvedValueOnce({
      rows: [
        { id: 1, description: 'Fiberglass 1" Pipe Covering', unit: 'LF', taxCategory: 'installed', sort_rank: 1 },
      ],
      ...DB_RESULT,
    });

    const { status, body } = await parseResponse(
      await GET(createContext(createGetRequest('q=fiberglass+1')))
    );

    expect(status).toBe(200);
    const results = body.results as Array<Record<string, unknown>>;
    expect(results.length).toBe(1);
  });

  it('includes vendor pricing when vendor parameter provided', async () => {
    mockedSql.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          description: 'Fiberglass 1"',
          unit: 'LF',
          taxCategory: 'installed',
          vendorPrice: 5.50,
          vendorPriceDate: '2026-01-15',
          bookPrice: 4.25,
          sort_rank: 1,
        },
      ],
      ...DB_RESULT,
    });

    const { status, body } = await parseResponse(
      await GET(createContext(createGetRequest('q=fiberglass&vendor=DIST01')))
    );

    expect(status).toBe(200);
    const results = body.results as Array<Record<string, unknown>>;
    expect(results[0]).toHaveProperty('vendorPrice');
    expect(results[0]).toHaveProperty('vendorPriceDate');
  });

  it('returns 500 on database error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockedSql.mockRejectedValueOnce(new Error('DB connection error'));

    const { status, body } = await parseResponse(
      await GET(createContext(createGetRequest('q=fiberglass')))
    );

    expect(status).toBe(500);
    expect(body.error).toContain('Internal server error');
  });
});
