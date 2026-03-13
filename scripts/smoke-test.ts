/**
 * RMI Smoke Test — validates all financial system API endpoints.
 *
 * Usage:
 *   ADMIN_API_KEY=xxx npx tsx scripts/smoke-test.ts [baseUrl]
 *   Default baseUrl: http://localhost:4321
 */

const baseUrl = process.argv[2] || 'http://localhost:4321';
const apiKey = process.env.ADMIN_API_KEY;

if (!apiKey) {
  console.error('Error: ADMIN_API_KEY environment variable is required.');
  console.error('Usage: ADMIN_API_KEY=xxx npx tsx scripts/smoke-test.ts [baseUrl]');
  process.exit(1);
}

interface TestResult {
  name: string;
  method: string;
  path: string;
  status: number;
  passed: boolean;
  responseTimeMs: number;
  detail: string;
}

const results: TestResult[] = [];

async function testEndpoint(
  method: 'GET' | 'POST',
  path: string,
  expectedKeys: string[],
  body?: Record<string, unknown>,
  detailExtractor?: (data: Record<string, unknown>) => string
): Promise<void> {
  const url = `${baseUrl}${path}`;
  const name = `${method} ${path}`;

  const start = performance.now();
  try {
    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const elapsed = Math.round(performance.now() - start);

    if (response.status !== 200 && response.status !== 201) {
      let errorText = '';
      try {
        const errBody = await response.json() as Record<string, unknown>;
        errorText = String(errBody.error || JSON.stringify(errBody));
      } catch {
        errorText = await response.text();
      }
      results.push({
        name, method, path, status: response.status,
        passed: false, responseTimeMs: elapsed,
        detail: errorText,
      });
      return;
    }

    const data = await response.json() as Record<string, unknown>;

    // Check that all expected keys are present
    const missingKeys = expectedKeys.filter(k => !(k in data));
    if (missingKeys.length > 0) {
      results.push({
        name, method, path, status: response.status,
        passed: false, responseTimeMs: elapsed,
        detail: `Missing keys: ${missingKeys.join(', ')}`,
      });
      return;
    }

    const detail = detailExtractor ? detailExtractor(data) : 'OK';
    results.push({
      name, method, path, status: response.status,
      passed: true, responseTimeMs: elapsed,
      detail,
    });
  } catch (error) {
    const elapsed = Math.round(performance.now() - start);
    results.push({
      name, method, path, status: 0,
      passed: false, responseTimeMs: elapsed,
      detail: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function run() {
  console.log(`\nRMI Smoke Test — ${baseUrl}`);
  console.log('================================');

  // 1. Jobs Master — list
  await testEndpoint('GET', '/api/admin/jobs-master?limit=5', ['jobs', 'pagination'], undefined,
    (d) => {
      const p = d.pagination as Record<string, unknown>;
      return `${p.total} total jobs`;
    });

  // 2. Jobs Master — stats
  await testEndpoint('GET', '/api/admin/jobs-master?action=stats', ['totalJobs', 'byYear'], undefined,
    (d) => `${d.totalJobs} total, byYear OK`);

  // 3. Jobs Master — customers
  await testEndpoint('GET', '/api/admin/jobs-master?action=customers', ['customers'], undefined,
    (d) => {
      const customers = d.customers as unknown[];
      return `${customers.length} customers`;
    });

  // 4. Materials Search
  await testEndpoint('GET', '/api/admin/materials-search?q=fiberglass', ['results'], undefined,
    (d) => {
      const results = d.results as unknown[];
      return `${results.length} results`;
    });

  // 5. Invoices — list
  await testEndpoint('GET', '/api/admin/invoices?limit=5', ['invoices', 'pagination'], undefined,
    (d) => {
      const p = d.pagination as Record<string, unknown>;
      return `${p.total} invoices`;
    });

  // 6. Tax Compute — dry run
  await testEndpoint('POST', '/api/admin/tax-compute', ['jobTaxStatus', 'lineItems', 'subtotal'],
    {
      jobNumber: '2026-001',
      lineItems: [{ materialId: 1, quantity: 10, pricePerItem: 5.00 }],
    },
    (d) => `jobTaxStatus: ${d.jobTaxStatus}`);

  // 7. WIP Costs
  await testEndpoint('GET', '/api/admin/wip-costs?month=2026-01', ['summary', 'jobs'], undefined,
    (d) => {
      const s = d.summary as Record<string, unknown>;
      return `${s.totalJobs} jobs, variance: $${s.variance}`;
    });

  // 8. Financial Reports
  await testEndpoint('GET', '/api/admin/financials?action=reports', [], undefined,
    () => 'reports OK');

  // ── Results ──
  console.log('');
  for (const r of results) {
    const icon = r.passed ? '\u2713' : '\u2717';
    const status = r.status || 'ERR';
    const padding = ' '.repeat(Math.max(0, 50 - r.name.length));
    console.log(`${icon} ${r.name}${padding}${status}  (${r.responseTimeMs}ms) — ${r.detail}`);
  }

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const failed = total - passed;

  console.log('================================');
  console.log(`Results: ${passed}/${total} passed${failed > 0 ? `, ${failed} failed` : ''}`);

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Smoke test runner error:', err);
  process.exit(1);
});
