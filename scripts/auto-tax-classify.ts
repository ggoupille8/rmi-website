/**
 * Auto-classify tax_status for jobs_master rows that are currently 'unknown'.
 *
 * Strategy (two passes):
 *   Pass 1 — Customer match: If ALL classified jobs for a customer have the
 *            same tax_status, apply that status to unclassified jobs for that customer.
 *   Pass 2 — Description match: Strip the year suffix ("- 2021" etc.) from
 *            descriptions. If ALL classified jobs with the same base description
 *            share a single tax_status, apply it to unclassified matches.
 *
 * Safety: Never touches jobs that already have tax_status != 'unknown'.
 *
 * Usage: npx tsx scripts/auto-tax-classify.ts [--dry-run]
 */

import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ─── Load .env.local ───

function loadEnv(): void {
  const envPath = resolve(ROOT, ".env.local");
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx);
    let val = trimmed.slice(eqIdx + 1);
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnv();

const DATABASE_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: No POSTGRES_URL or DATABASE_URL found in .env.local");
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const DRY_RUN = process.argv.includes("--dry-run");

/** Strip " - 2021", " - 2022", etc. from the end of a description and lowercase */
function normalizeDescription(desc: string): string {
  return desc
    .replace(/\s*-\s*20\d{2}\s*$/i, "")
    .trim()
    .toLowerCase();
}

// ─── Main ───

async function main(): Promise<void> {
  console.log(
    `\n${"=".repeat(60)}\n  Auto Tax Classification ${DRY_RUN ? "(DRY RUN)" : ""}\n${"=".repeat(60)}\n`
  );

  // ─── Current state ───
  const [totalRows, unknownRows, classifiedRows] = await Promise.all([
    sql`SELECT COUNT(*)::int AS n FROM jobs_master`,
    sql`SELECT COUNT(*)::int AS n FROM jobs_master WHERE tax_status = 'unknown'`,
    sql`SELECT COUNT(*)::int AS n FROM jobs_master WHERE tax_status != 'unknown'`,
  ]);

  const startUnknown = unknownRows[0].n;
  console.log(`Total jobs:              ${totalRows[0].n}`);
  console.log(`Already classified:      ${classifiedRows[0].n}`);
  console.log(`Needing classification:  ${startUnknown}`);

  // Track all IDs we will update: id → { status, method }
  const updates = new Map<number, { status: string; method: string; jobNumber: string }>();

  // ─────────────────────────────────────────────
  // PASS 1: Customer-name matching
  // ─────────────────────────────────────────────
  console.log(`\n${"─".repeat(60)}\n  Pass 1: Customer-name matching\n${"─".repeat(60)}`);

  const customerPatterns = await sql`
    SELECT
      LOWER(TRIM(customer_name_raw)) AS customer_key,
      customer_name_raw,
      COUNT(*)::int AS classified_count,
      COUNT(DISTINCT tax_status)::int AS distinct_statuses,
      MIN(tax_status) AS uniform_status,
      ARRAY_AGG(DISTINCT tax_status) AS statuses
    FROM jobs_master
    WHERE tax_status != 'unknown'
      AND customer_name_raw IS NOT NULL
      AND TRIM(customer_name_raw) != ''
      AND customer_name_raw != 'undefined'
    GROUP BY LOWER(TRIM(customer_name_raw)), customer_name_raw
    ORDER BY classified_count DESC
  `;

  const customerTaxMap = new Map<string, { status: string; name: string; count: number }>();
  for (const row of customerPatterns) {
    if (row.distinct_statuses === 1) {
      customerTaxMap.set(row.customer_key, {
        status: row.uniform_status,
        name: row.customer_name_raw,
        count: row.classified_count,
      });
    }
  }

  console.log(`\nCustomers with 100% consistent status: ${customerTaxMap.size}`);

  // Find unknown jobs that match
  const unknownByCustomer = await sql`
    SELECT id, job_number, customer_name_raw
    FROM jobs_master
    WHERE tax_status = 'unknown'
      AND customer_name_raw IS NOT NULL
      AND TRIM(customer_name_raw) != ''
      AND customer_name_raw != 'undefined'
    ORDER BY job_number
  `;

  let pass1Count = 0;
  for (const job of unknownByCustomer) {
    const key = job.customer_name_raw.trim().toLowerCase();
    const match = customerTaxMap.get(key);
    if (match && !updates.has(job.id)) {
      updates.set(job.id, {
        status: match.status,
        method: "customer",
        jobNumber: job.job_number,
      });
      pass1Count++;
    }
  }

  console.log(`Jobs matched by customer: ${pass1Count}`);

  // ─────────────────────────────────────────────
  // PASS 2: Description matching
  // ─────────────────────────────────────────────
  console.log(`\n${"─".repeat(60)}\n  Pass 2: Description matching\n${"─".repeat(60)}`);

  // Build description → tax status map from classified jobs
  const classifiedJobs = await sql`
    SELECT id, description, tax_status
    FROM jobs_master
    WHERE tax_status != 'unknown'
      AND description IS NOT NULL
      AND TRIM(description) != ''
      AND description != 'undefined'
  `;

  const descMap = new Map<string, { statuses: Set<string>; count: number }>();
  for (const r of classifiedJobs) {
    const baseDesc = normalizeDescription(r.description);
    if (!baseDesc) continue;

    const entry = descMap.get(baseDesc) || { statuses: new Set<string>(), count: 0 };
    entry.statuses.add(r.tax_status);
    entry.count++;
    descMap.set(baseDesc, entry);
  }

  const consistentDescs = [...descMap.entries()].filter(
    ([, v]) => v.statuses.size === 1
  );
  console.log(
    `\nDescriptions with consistent status: ${consistentDescs.length} (of ${descMap.size} unique)`
  );

  // Find unknown jobs whose normalized description matches
  const unknownAllJobs = await sql`
    SELECT id, job_number, description
    FROM jobs_master
    WHERE tax_status = 'unknown'
      AND description IS NOT NULL
      AND TRIM(description) != ''
      AND description != 'undefined'
    ORDER BY job_number
  `;

  let pass2Count = 0;
  for (const job of unknownAllJobs) {
    if (updates.has(job.id)) continue; // already matched in pass 1

    const baseDesc = normalizeDescription(job.description);
    const match = descMap.get(baseDesc);
    if (match && match.statuses.size === 1) {
      const status = [...match.statuses][0];
      updates.set(job.id, {
        status,
        method: "description",
        jobNumber: job.job_number,
      });
      pass2Count++;
    }
  }

  console.log(`Jobs matched by description: ${pass2Count}`);

  // ─────────────────────────────────────────────
  // Summary before applying
  // ─────────────────────────────────────────────
  const totalMatched = updates.size;
  const byStatus: Record<string, number> = {};
  const byMethod: Record<string, number> = {};
  for (const [, info] of updates) {
    byStatus[info.status] = (byStatus[info.status] || 0) + 1;
    byMethod[info.method] = (byMethod[info.method] || 0) + 1;
  }

  console.log(`\n${"─".repeat(60)}\n  Summary\n${"─".repeat(60)}`);
  console.log(`\nTotal auto-classified: ${totalMatched} of ${startUnknown}`);
  console.log(`\nBy status:`);
  for (const [status, count] of Object.entries(byStatus).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${status.padEnd(10)} ${count}`);
  }
  console.log(`\nBy method:`);
  for (const [method, count] of Object.entries(byMethod).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${method.padEnd(14)} ${count}`);
  }

  // ─────────────────────────────────────────────
  // Apply updates
  // ─────────────────────────────────────────────
  if (!DRY_RUN && totalMatched > 0) {
    console.log(`\nApplying updates...`);

    // Group by status for batch updates
    const batches = new Map<string, number[]>();
    for (const [id, info] of updates) {
      const ids = batches.get(info.status) || [];
      ids.push(id);
      batches.set(info.status, ids);
    }

    for (const [status, ids] of batches) {
      for (let i = 0; i < ids.length; i += 500) {
        const chunk = ids.slice(i, i + 500);
        const placeholders = chunk.map((_, idx) => `$${idx + 2}`).join(", ");
        await sql(
          `UPDATE jobs_master SET tax_status = $1, updated_at = NOW() WHERE id IN (${placeholders}) AND tax_status = 'unknown'`,
          [status, ...chunk]
        );
        console.log(`  Updated ${chunk.length} jobs → '${status}'`);
      }
    }
  }

  // ─────────────────────────────────────────────
  // Final state
  // ─────────────────────────────────────────────
  const finalBreakdown = await sql`
    SELECT tax_status, COUNT(*)::int AS cnt
    FROM jobs_master
    GROUP BY tax_status
    ORDER BY cnt DESC
  `;
  const remainingUnknown =
    finalBreakdown.find((r) => r.tax_status === "unknown")?.cnt ?? 0;

  console.log(`\n${"=".repeat(60)}\n  Final Breakdown\n${"=".repeat(60)}\n`);
  for (const row of finalBreakdown) {
    const pct = ((row.cnt / totalRows[0].n) * 100).toFixed(1);
    console.log(`  ${row.tax_status.padEnd(12)} ${String(row.cnt).padStart(5)}  (${pct}%)`);
  }

  console.log(`\n  Classified:  ${totalRows[0].n - remainingUnknown} of ${totalRows[0].n}`);
  console.log(`  Remaining:   ${remainingUnknown}`);

  // Show remaining unknown breakdown
  if (remainingUnknown > 0) {
    const remainingDescs = await sql`
      SELECT
        COALESCE(NULLIF(TRIM(description), ''), '(no description)') AS desc_preview,
        COUNT(*)::int AS cnt
      FROM jobs_master
      WHERE tax_status = 'unknown'
      GROUP BY desc_preview
      ORDER BY cnt DESC
      LIMIT 25
    `;
    console.log(`\n  Remaining unknown jobs by description (top 25):`);
    for (const row of remainingDescs) {
      console.log(`    ${row.desc_preview.slice(0, 55).padEnd(55)} ×${row.cnt}`);
    }
  }

  console.log(
    `\nDone.${DRY_RUN ? " (DRY RUN — no changes were made)" : ""}\n`
  );
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
