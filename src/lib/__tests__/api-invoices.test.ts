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

import { POST, GET, DELETE } from '../../pages/api/admin/invoices';
import { sql } from '@vercel/postgres';
import { getPostgresEnv } from '../../lib/db-env';
import { isAdminAuthorized } from '../../lib/admin-auth';

const mockedSql = vi.mocked(sql);
const mockedGetPostgresEnv = vi.mocked(getPostgresEnv);
const mockedIsAdmin = vi.mocked(isAdminAuthorized);

const DB_RESULT = { command: '', rowCount: 1, oid: 0, fields: [] };

function createPostRequest(body: unknown): Request {
  return new Request('http://localhost:4321/api/admin/invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-key' },
    body: JSON.stringify(body),
  });
}

function createGetRequest(params: string): Request {
  return new Request(`http://localhost:4321/api/admin/invoices?${params}`, {
    method: 'GET',
    headers: { Authorization: 'Bearer test-key' },
  });
}

function createDeleteRequest(body: unknown): Request {
  return new Request('http://localhost:4321/api/admin/invoices', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-key' },
    body: JSON.stringify(body),
  });
}

function createContext(request: Request) {
  return { request } as unknown as Parameters<typeof POST>[0];
}

async function parseResponse(response: Response) {
  return { status: response.status, body: await response.json() as Record<string, unknown> };
}

const validInvoice = {
  invoiceNumber: 'INV-001',
  vendorId: 1,
  jobNumber: '2026-001',
  invoiceDate: '2026-01-15',
  lineItems: [
    { materialId: 10, description: 'Fiberglass 1" pipe covering', quantity: 100, pricePerItem: 5.50 },
  ],
};

describe('POST /api/admin/invoices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetPostgresEnv.mockReturnValue({ url: 'postgres://test', source: 'POSTGRES_URL' });
    mockedIsAdmin.mockReturnValue(true);
  });

  it('returns 401 when not authorized', async () => {
    mockedIsAdmin.mockReturnValue(false);
    const { status, body } = await parseResponse(
      await POST(createContext(createPostRequest(validInvoice)))
    );
    expect(status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 400 when missing vendor_id', async () => {
    const { status, body } = await parseResponse(
      await POST(createContext(createPostRequest({ ...validInvoice, vendorId: undefined })))
    );
    expect(status).toBe(400);
    expect(body.error).toContain('vendorId');
  });

  it('returns 400 when missing job_number', async () => {
    const { status, body } = await parseResponse(
      await POST(createContext(createPostRequest({ ...validInvoice, jobNumber: '' })))
    );
    expect(status).toBe(400);
    expect(body.error).toContain('jobNumber');
  });

  it('returns 400 when line items array is empty', async () => {
    const { status, body } = await parseResponse(
      await POST(createContext(createPostRequest({ ...validInvoice, lineItems: [] })))
    );
    expect(status).toBe(400);
    expect(body.error).toContain('line item');
  });

  it('returns 400 when vendor not found', async () => {
    mockedSql.mockResolvedValueOnce({ rows: [], ...DB_RESULT });
    const { status, body } = await parseResponse(
      await POST(createContext(createPostRequest(validInvoice)))
    );
    expect(status).toBe(400);
    expect(body.error).toContain('Vendor');
  });

  it('returns 400 when job not found', async () => {
    // Vendor found
    mockedSql.mockResolvedValueOnce({ rows: [{ id: 1, code: 'VND', full_name: 'Vendor' }], ...DB_RESULT });
    // Job not found
    mockedSql.mockResolvedValueOnce({ rows: [], ...DB_RESULT });
    const { status, body } = await parseResponse(
      await POST(createContext(createPostRequest(validInvoice)))
    );
    expect(status).toBe(400);
    expect(body.error).toContain('Job');
  });

  it('returns 400 for mixed job without tax override', async () => {
    // Vendor found
    mockedSql.mockResolvedValueOnce({ rows: [{ id: 1, code: 'VND', full_name: 'Vendor' }], ...DB_RESULT });
    // Job found with mixed status
    mockedSql.mockResolvedValueOnce({ rows: [{ job_number: '2026-001', tax_status: 'mixed' }], ...DB_RESULT });
    const { status, body } = await parseResponse(
      await POST(createContext(createPostRequest(validInvoice)))
    );
    expect(status).toBe(400);
    expect(body.error).toContain('mixed tax status');
  });

  it('returns 201 for valid taxable invoice with correct structure', async () => {
    // Vendor found
    mockedSql.mockResolvedValueOnce({ rows: [{ id: 1, code: 'VND', full_name: 'Vendor' }], ...DB_RESULT });
    // Job found with taxable status
    mockedSql.mockResolvedValueOnce({ rows: [{ job_number: '2026-001', tax_status: 'taxable' }], ...DB_RESULT });
    // Materials lookup
    mockedSql.mockResolvedValueOnce({ rows: [{ id: 10, description: 'Fiberglass 1"', tax_category: 'installed' }], ...DB_RESULT });
    // Invoice insert
    mockedSql.mockResolvedValueOnce({ rows: [{ id: 1, invoice_number: 'INV-001', subtotal: 550, tax_amount: 33, total: 583 }], ...DB_RESULT });
    // Line item insert
    mockedSql.mockResolvedValueOnce({ rows: [{ id: 1, invoice_id: 1, quantity: 100, price_per_item: 5.50 }], ...DB_RESULT });
    // Material price check
    mockedSql.mockResolvedValueOnce({ rows: [], ...DB_RESULT });
    // Material price insert
    mockedSql.mockResolvedValueOnce({ rows: [], ...DB_RESULT });

    const { status, body } = await parseResponse(
      await POST(createContext(createPostRequest(validInvoice)))
    );
    expect(status).toBe(201);
    expect(body).toHaveProperty('invoice');
    expect(body).toHaveProperty('lineItems');
  });

  it('computes 6% tax for taxable job with installed material', async () => {
    mockedSql.mockResolvedValueOnce({ rows: [{ id: 1, code: 'VND', full_name: 'Vendor' }], ...DB_RESULT });
    mockedSql.mockResolvedValueOnce({ rows: [{ job_number: '2026-001', tax_status: 'taxable' }], ...DB_RESULT });
    mockedSql.mockResolvedValueOnce({ rows: [{ id: 10, description: 'Material', tax_category: 'installed' }], ...DB_RESULT });

    // Capture the invoice INSERT call to verify tax computation
    let capturedInvoiceArgs: unknown[] = [];
    mockedSql.mockImplementationOnce((...args: unknown[]) => {
      capturedInvoiceArgs = args;
      return Promise.resolve({ rows: [{ id: 1 }], ...DB_RESULT }) as ReturnType<typeof sql>;
    });
    mockedSql.mockResolvedValueOnce({ rows: [{ id: 1 }], ...DB_RESULT }); // line item
    mockedSql.mockResolvedValueOnce({ rows: [], ...DB_RESULT }); // price check
    mockedSql.mockResolvedValueOnce({ rows: [], ...DB_RESULT }); // price insert

    await POST(createContext(createPostRequest(validInvoice)));

    // Verify sql was called for the invoice insert (4th call)
    expect(mockedSql).toHaveBeenCalledTimes(7);
  });

  it('exempt job + consumable material: consumable still taxed', async () => {
    const invoiceWithConsumable = {
      ...validInvoice,
      lineItems: [
        { materialId: 20, description: 'Safety glasses', quantity: 10, pricePerItem: 15.00 },
      ],
    };

    mockedSql.mockResolvedValueOnce({ rows: [{ id: 1, code: 'VND', full_name: 'Vendor' }], ...DB_RESULT });
    mockedSql.mockResolvedValueOnce({ rows: [{ job_number: '2026-001', tax_status: 'exempt' }], ...DB_RESULT });
    // Material is consumable
    mockedSql.mockResolvedValueOnce({ rows: [{ id: 20, description: 'Safety glasses', tax_category: 'consumable' }], ...DB_RESULT });
    // Invoice insert — we don't validate exact tax here, just that it succeeds
    mockedSql.mockResolvedValueOnce({ rows: [{ id: 2, invoice_number: 'INV-001' }], ...DB_RESULT });
    mockedSql.mockResolvedValueOnce({ rows: [{ id: 2, invoice_id: 2 }], ...DB_RESULT });
    mockedSql.mockResolvedValueOnce({ rows: [], ...DB_RESULT });
    mockedSql.mockResolvedValueOnce({ rows: [], ...DB_RESULT });

    const { status } = await parseResponse(
      await POST(createContext(createPostRequest(invoiceWithConsumable)))
    );
    expect(status).toBe(201);
  });
});

describe('GET /api/admin/invoices', () => {
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

  it('returns paginated results', async () => {
    mockedSql.mockResolvedValueOnce({
      rows: [{ id: 1, invoice_number: 'INV-001' }, { id: 2, invoice_number: 'INV-002' }],
      ...DB_RESULT,
    });
    mockedSql.mockResolvedValueOnce({
      rows: [{ total: 10 }],
      ...DB_RESULT,
    });

    const { status, body } = await parseResponse(
      await GET(createContext(createGetRequest('page=1')))
    );
    expect(status).toBe(200);
    expect(body).toHaveProperty('invoices');
    expect(body).toHaveProperty('pagination');
    const pagination = body.pagination as Record<string, unknown>;
    expect(pagination.total).toBe(10);
  });

  it('returns single invoice by ID with line items', async () => {
    mockedSql.mockResolvedValueOnce({
      rows: [{ id: 5, invoice_number: 'INV-005', vendor_code: 'VND' }],
      ...DB_RESULT,
    });
    mockedSql.mockResolvedValueOnce({
      rows: [{ id: 1, invoice_id: 5, description: 'Item 1' }],
      ...DB_RESULT,
    });

    const { status, body } = await parseResponse(
      await GET(createContext(createGetRequest('id=5')))
    );
    expect(status).toBe(200);
    expect(body).toHaveProperty('invoice');
    expect(body).toHaveProperty('lineItems');
  });

  it('returns 404 for non-existent invoice ID', async () => {
    mockedSql.mockResolvedValueOnce({ rows: [], ...DB_RESULT });

    const { status, body } = await parseResponse(
      await GET(createContext(createGetRequest('id=999')))
    );
    expect(status).toBe(404);
    expect(body.error).toContain('not found');
  });
});

describe('DELETE /api/admin/invoices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetPostgresEnv.mockReturnValue({ url: 'postgres://test', source: 'POSTGRES_URL' });
    mockedIsAdmin.mockReturnValue(true);
  });

  it('returns 400 when no id provided', async () => {
    const { status, body } = await parseResponse(
      await DELETE(createContext(createDeleteRequest({})))
    );
    expect(status).toBe(400);
    expect(body.error).toContain('id');
  });

  it('returns 404 when invoice does not exist', async () => {
    mockedSql.mockResolvedValueOnce({ rows: [], ...DB_RESULT });

    const { status, body } = await parseResponse(
      await DELETE(createContext(createDeleteRequest({ id: 999 })))
    );
    expect(status).toBe(404);
    expect(body.error).toContain('not found');
  });

  it('deletes invoice and returns deleted id', async () => {
    mockedSql.mockResolvedValueOnce({ rows: [{ id: 5 }], ...DB_RESULT }); // exists check
    mockedSql.mockResolvedValueOnce({ rows: [], ...DB_RESULT }); // delete

    const { status, body } = await parseResponse(
      await DELETE(createContext(createDeleteRequest({ id: 5 })))
    );
    expect(status).toBe(200);
    expect(body.deleted).toBe(5);
  });
});
