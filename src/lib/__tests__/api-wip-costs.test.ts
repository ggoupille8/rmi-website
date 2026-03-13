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

import { GET } from '../../pages/api/admin/wip-costs';
import { sql } from '@vercel/postgres';
import { getPostgresEnv } from '../../lib/db-env';
import { isAdminAuthorized } from '../../lib/admin-auth';

const mockedSql = vi.mocked(sql);
const mockedGetPostgresEnv = vi.mocked(getPostgresEnv);
const mockedIsAdmin = vi.mocked(isAdminAuthorized);

const DB_RESULT = { command: '', rowCount: 0, oid: 0, fields: [] };

function createGetRequest(params: string): Request {
  return new Request(`http://localhost:4321/api/admin/wip-costs?${params}`, {
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

function setupDefaultMocks() {
  // Invoice costs query
  mockedSql.mockResolvedValueOnce({
    rows: [
      { job_number: '2026-001', invoice_total_cost: '15000.00', total_tax: '900.00', line_item_count: 5, first_invoice: '2026-01-05', last_invoice: '2026-01-28' },
      { job_number: '2026-002', invoice_total_cost: '8500.00', total_tax: '510.00', line_item_count: 3, first_invoice: '2026-01-10', last_invoice: '2026-01-20' },
    ],
    ...DB_RESULT,
  });

  // WIP costs query
  mockedSql.mockResolvedValueOnce({
    rows: [
      { job_number: '2026-001', costs_to_date: 14500, project_manager: 'GG', description: 'Alpha Project' },
      { job_number: '2026-002', costs_to_date: 9000, project_manager: 'MD', description: 'Baker Project' },
      { job_number: '2026-003', costs_to_date: 5000, project_manager: 'GG', description: 'Charlie Project' },
    ],
    ...DB_RESULT,
  });

  // Jobs master query
  mockedSql.mockResolvedValueOnce({
    rows: [
      { job_number: '2026-001', description: 'Alpha Project', project_manager: 'GG', customer_name_raw: 'Alpha Co' },
      { job_number: '2026-002', description: 'Baker Project', project_manager: 'MD', customer_name_raw: 'Baker Inc' },
      { job_number: '2026-003', description: 'Charlie Project', project_manager: 'GG', customer_name_raw: 'Charlie LLC' },
    ],
    ...DB_RESULT,
  });
}

describe('GET /api/admin/wip-costs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetPostgresEnv.mockReturnValue({ url: 'postgres://test', source: 'POSTGRES_URL' });
    mockedIsAdmin.mockReturnValue(true);
  });

  it('returns 401 when not authorized', async () => {
    mockedIsAdmin.mockReturnValue(false);
    const { status } = await parseResponse(
      await GET(createContext(createGetRequest('month=2026-01')))
    );
    expect(status).toBe(401);
  });

  it('returns 400 when month parameter is missing', async () => {
    const { status, body } = await parseResponse(
      await GET(createContext(createGetRequest('')))
    );
    expect(status).toBe(400);
    expect(body.error).toContain('month');
  });

  it('returns 400 for invalid month format', async () => {
    const { status, body } = await parseResponse(
      await GET(createContext(createGetRequest('month=2026')))
    );
    expect(status).toBe(400);
    expect(body.error).toContain('month');
  });

  it('returns 400 for invalid month value (13)', async () => {
    const { status, body } = await parseResponse(
      await GET(createContext(createGetRequest('month=2026-13')))
    );
    expect(status).toBe(400);
    expect(body.error).toContain('Invalid');
  });

  it('returns summary with totalJobs, totalInvoiceCost, totalWipCost, variance', async () => {
    setupDefaultMocks();

    const { status, body } = await parseResponse(
      await GET(createContext(createGetRequest('month=2026-01')))
    );

    expect(status).toBe(200);
    expect(body).toHaveProperty('month', '2026-01');
    expect(body).toHaveProperty('summary');
    expect(body).toHaveProperty('jobs');
    expect(body).toHaveProperty('pmBreakdown');

    const summary = body.summary as Record<string, unknown>;
    expect(summary).toHaveProperty('totalJobs');
    expect(summary).toHaveProperty('totalInvoiceCost');
    expect(summary).toHaveProperty('totalWipCost');
    expect(summary).toHaveProperty('variance');
    expect(typeof summary.totalJobs).toBe('number');
    expect(typeof summary.totalInvoiceCost).toBe('number');
  });

  it('includes all jobs from both invoices and WIP', async () => {
    setupDefaultMocks();

    const { body } = await parseResponse(
      await GET(createContext(createGetRequest('month=2026-01')))
    );

    const jobs = body.jobs as Array<Record<string, unknown>>;
    // 2 from invoices + 1 from WIP only = 3 total
    expect(jobs.length).toBe(3);
  });

  it('marks job as wip_only when it has WIP but no invoices', async () => {
    setupDefaultMocks();

    const { body } = await parseResponse(
      await GET(createContext(createGetRequest('month=2026-01')))
    );

    const jobs = body.jobs as Array<Record<string, unknown>>;
    const wipOnly = jobs.find(j => j.jobNumber === '2026-003');
    expect(wipOnly).toBeDefined();
    expect(wipOnly?.status).toBe('wip_only');
  });

  it('computes variance correctly (invoice - wip)', async () => {
    setupDefaultMocks();

    const { body } = await parseResponse(
      await GET(createContext(createGetRequest('month=2026-01')))
    );

    const jobs = body.jobs as Array<Record<string, unknown>>;
    const job1 = jobs.find(j => j.jobNumber === '2026-001');
    expect(job1).toBeDefined();
    // invoiceCost=15000, wipCosts=14500, variance=500
    expect(job1?.variance).toBeCloseTo(500, 2);
  });

  it('PM filter reduces results to matching PM only', async () => {
    setupDefaultMocks();

    const { body } = await parseResponse(
      await GET(createContext(createGetRequest('month=2026-01&pm=GG')))
    );

    const jobs = body.jobs as Array<Record<string, unknown>>;
    // Only GG jobs: 2026-001 and 2026-003
    expect(jobs.every(j => j.pm === 'GG')).toBe(true);
    expect(jobs.length).toBe(2);
  });

  it('returns pmBreakdown with aggregated totals', async () => {
    setupDefaultMocks();

    const { body } = await parseResponse(
      await GET(createContext(createGetRequest('month=2026-01')))
    );

    const pmBreakdown = body.pmBreakdown as Array<Record<string, unknown>>;
    expect(pmBreakdown.length).toBeGreaterThan(0);
    expect(pmBreakdown[0]).toHaveProperty('pm');
    expect(pmBreakdown[0]).toHaveProperty('invoiceCost');
    expect(pmBreakdown[0]).toHaveProperty('wipCost');
    expect(pmBreakdown[0]).toHaveProperty('variance');
  });

  it('sorts jobs by absolute variance descending', async () => {
    setupDefaultMocks();

    const { body } = await parseResponse(
      await GET(createContext(createGetRequest('month=2026-01')))
    );

    const jobs = body.jobs as Array<Record<string, unknown>>;
    for (let i = 0; i < jobs.length - 1; i++) {
      expect(Math.abs(jobs[i].variance as number)).toBeGreaterThanOrEqual(
        Math.abs(jobs[i + 1].variance as number)
      );
    }
  });

  it('returns 500 on database error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockedSql.mockRejectedValueOnce(new Error('DB error'));

    const { status, body } = await parseResponse(
      await GET(createContext(createGetRequest('month=2026-01')))
    );

    expect(status).toBe(500);
    expect(body.error).toContain('Internal server error');
  });
});
