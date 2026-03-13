import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock external dependencies before imports
vi.mock('@vercel/postgres', () => ({
  sql: Object.assign(vi.fn(), { query: vi.fn() }),
}));

vi.mock('../../lib/db-env', () => ({
  getPostgresEnv: vi.fn(),
}));

vi.mock('../../lib/admin-auth', () => ({
  isAdminAuthorized: vi.fn(),
}));

import { GET, PATCH, POST } from '../../pages/api/admin/jobs-master';
import { sql } from '@vercel/postgres';
import { getPostgresEnv } from '../../lib/db-env';
import { isAdminAuthorized } from '../../lib/admin-auth';

const mockedSql = vi.mocked(sql);
const mockedSqlQuery = vi.mocked(sql.query);
const mockedGetPostgresEnv = vi.mocked(getPostgresEnv);
const mockedIsAdmin = vi.mocked(isAdminAuthorized);

const DB_RESULT = { command: '', rowCount: 1, oid: 0, fields: [] };

function createGetRequest(params: string): Request {
  return new Request(`http://localhost:4321/api/admin/jobs-master?${params}`, {
    method: 'GET',
    headers: { Authorization: 'Bearer test-key' },
  });
}

function createPatchRequest(body: unknown): Request {
  return new Request('http://localhost:4321/api/admin/jobs-master', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-key' },
    body: JSON.stringify(body),
  });
}

function createPostRequest(body: unknown): Request {
  return new Request('http://localhost:4321/api/admin/jobs-master', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-key' },
    body: JSON.stringify(body),
  });
}

function createContext(request: Request) {
  return { request } as unknown as Parameters<typeof GET>[0];
}

async function parseResponse(response: Response) {
  return { status: response.status, body: await response.json() as Record<string, unknown> };
}

describe('GET /api/admin/jobs-master', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetPostgresEnv.mockReturnValue({ url: 'postgres://test', source: 'POSTGRES_URL' });
    mockedIsAdmin.mockReturnValue(true);
  });

  it('returns 401 when not authorized', async () => {
    mockedIsAdmin.mockReturnValue(false);
    const { status } = await parseResponse(
      await GET(createContext(createGetRequest('limit=5')))
    );
    expect(status).toBe(401);
  });

  it('returns paginated job list with correct total count', async () => {
    // Main list query, count query, tax breakdown query — all via sql.query
    mockedSqlQuery
      .mockResolvedValueOnce({
        rows: [
          { id: 1, job_number: '2026-001', year: 2026, description: 'Test Job' },
          { id: 2, job_number: '2026-002', year: 2026, description: 'Another Job' },
        ],
        ...DB_RESULT,
      })
      .mockResolvedValueOnce({
        rows: [{ total: 50 }],
        ...DB_RESULT,
      })
      .mockResolvedValueOnce({
        rows: [{ taxable: 20, exempt: 15, mixed: 10, unknown: 5 }],
        ...DB_RESULT,
      });

    const { status, body } = await parseResponse(
      await GET(createContext(createGetRequest('limit=5&page=1')))
    );

    expect(status).toBe(200);
    expect(body).toHaveProperty('jobs');
    expect(body).toHaveProperty('pagination');
    expect(body).toHaveProperty('taxBreakdown');
    const pagination = body.pagination as Record<string, unknown>;
    expect(pagination.total).toBe(50);
  });

  it('stats action returns aggregate counts', async () => {
    mockedSqlQuery.mockResolvedValueOnce({
      rows: [{
        totalJobs: 1440,
        byYear: { '2021': 200, '2022': 250, '2023': 300, '2024': 280, '2025': 260, '2026': 150 },
        byTaxStatus: { taxable: 800, exempt: 400, mixed: 140, unknown: 100 },
        byPM: { GG: 400, RG: 350, MD: 390, SB: 300 },
        byContractType: { LS: 600, TM: 500, 'TM NTE': 200, NTE: 140 },
        needsClassification: 100,
      }],
      ...DB_RESULT,
    });

    const { status, body } = await parseResponse(
      await GET(createContext(createGetRequest('action=stats')))
    );

    expect(status).toBe(200);
    expect(body.totalJobs).toBe(1440);
    expect(body).toHaveProperty('byYear');
    expect(body).toHaveProperty('byTaxStatus');
    expect(body).toHaveProperty('byPM');
    expect(body).toHaveProperty('byContractType');
  });

  it('customers action returns list with job counts', async () => {
    mockedSqlQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, canonicalName: 'Customer A', shortCode: 'CUSTA', jobCount: 25 },
        { id: 2, canonicalName: 'Customer B', shortCode: 'CUSTB', jobCount: 12 },
      ],
      ...DB_RESULT,
    });

    const { status, body } = await parseResponse(
      await GET(createContext(createGetRequest('action=customers')))
    );

    expect(status).toBe(200);
    const customers = body.customers as Array<Record<string, unknown>>;
    expect(customers.length).toBe(2);
    expect(customers[0]).toHaveProperty('jobCount');
  });
});

describe('PATCH /api/admin/jobs-master', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetPostgresEnv.mockReturnValue({ url: 'postgres://test', source: 'POSTGRES_URL' });
    mockedIsAdmin.mockReturnValue(true);
  });

  it('returns 400 when id is missing', async () => {
    const { status, body } = await parseResponse(
      await PATCH(createContext(createPatchRequest({ tax_status: 'taxable' })))
    );
    expect(status).toBe(400);
    expect(body.error).toContain('id');
  });

  it('returns 400 for invalid tax_status', async () => {
    const { status, body } = await parseResponse(
      await PATCH(createContext(createPatchRequest({ id: 1, tax_status: 'invalid' })))
    );
    expect(status).toBe(400);
    expect(body.error).toContain('tax_status');
  });

  it('returns 400 when no valid fields to update', async () => {
    const { status, body } = await parseResponse(
      await PATCH(createContext(createPatchRequest({ id: 1 })))
    );
    expect(status).toBe(400);
    expect(body.error).toContain('No valid fields');
  });

  it('setting tax_status to taxable clears exemption_type', async () => {
    mockedSqlQuery.mockResolvedValueOnce({
      rows: [{ id: 1, job_number: '2026-001', tax_status: 'taxable', tax_exemption_type: null }],
      ...DB_RESULT,
    });

    const { status, body } = await parseResponse(
      await PATCH(createContext(createPatchRequest({ id: 1, tax_status: 'taxable' })))
    );

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    // Verify the query was called with SET containing tax_exemption_type = NULL
    expect(mockedSqlQuery).toHaveBeenCalledWith(
      expect.stringContaining('tax_exemption_type = NULL'),
      expect.any(Array)
    );
  });

  it('returns 404 when job not found', async () => {
    mockedSqlQuery.mockResolvedValueOnce({ rows: [], ...DB_RESULT });

    const { status, body } = await parseResponse(
      await PATCH(createContext(createPatchRequest({ id: 999, tax_status: 'exempt' })))
    );
    expect(status).toBe(404);
    expect(body.error).toContain('not found');
  });

  it('warns when exempt job has no exemption type', async () => {
    mockedSqlQuery.mockResolvedValueOnce({
      rows: [{ id: 1, tax_status: 'exempt', tax_exemption_type: null }],
      ...DB_RESULT,
    });

    const { status, body } = await parseResponse(
      await PATCH(createContext(createPatchRequest({ id: 1, tax_status: 'exempt' })))
    );

    expect(status).toBe(200);
    const warnings = body.warnings as string[];
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain('exemption type');
  });
});

describe('POST /api/admin/jobs-master (bulk classify)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetPostgresEnv.mockReturnValue({ url: 'postgres://test', source: 'POSTGRES_URL' });
    mockedIsAdmin.mockReturnValue(true);
  });

  it('returns 400 for empty jobIds', async () => {
    const { status, body } = await parseResponse(
      await POST(createContext(createPostRequest({ jobIds: [], taxStatus: 'taxable' })))
    );
    expect(status).toBe(400);
    expect(body.error).toContain('non-empty');
  });

  it('returns 400 for more than 500 jobs', async () => {
    const jobIds = Array.from({ length: 501 }, (_, i) => i + 1);
    const { status, body } = await parseResponse(
      await POST(createContext(createPostRequest({ jobIds, taxStatus: 'taxable' })))
    );
    expect(status).toBe(400);
    expect(body.error).toContain('500');
  });

  it('returns 400 for invalid taxStatus', async () => {
    const { status, body } = await parseResponse(
      await POST(createContext(createPostRequest({ jobIds: [1, 2], taxStatus: 'bogus' })))
    );
    expect(status).toBe(400);
    expect(body.error).toContain('taxStatus');
  });

  it('returns 400 when jobIds contains non-numbers', async () => {
    const { status, body } = await parseResponse(
      await POST(createContext(createPostRequest({ jobIds: [1, 'abc'], taxStatus: 'taxable' })))
    );
    expect(status).toBe(400);
    expect(body.error).toContain('numbers');
  });

  it('bulk classifies multiple records and returns count', async () => {
    mockedSqlQuery.mockResolvedValueOnce({
      rows: [{ id: 1 }, { id: 2 }, { id: 3 }],
      rowCount: 3,
      command: '', oid: 0, fields: [],
    });

    const { status, body } = await parseResponse(
      await POST(createContext(createPostRequest({ jobIds: [1, 2, 3], taxStatus: 'taxable' })))
    );

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.updated).toBe(3);
    const ids = body.ids as number[];
    expect(ids).toEqual([1, 2, 3]);
  });
});
