import type { APIRoute } from "astro";
import { sql } from "@vercel/postgres";
import { getPostgresEnv } from "../../../lib/db-env";
import crypto from "crypto";

export const prerender = false;

const SECURITY_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function isSyncKeyValid(request: Request): boolean {
  const key = request.headers.get("x-sync-key");
  if (!key) return false;

  const syncKey =
    process.env.SYNC_API_KEY ?? import.meta.env.SYNC_API_KEY;
  if (!syncKey) return false;

  const keyBuffer = Buffer.from(key);
  const syncBuffer = Buffer.from(syncKey);
  if (keyBuffer.length !== syncBuffer.length) return false;

  return crypto.timingSafeEqual(keyBuffer, syncBuffer);
}

// ── Types ──────────────────────────────────────────────

interface JobPayload {
  job_number: string;
  year: number;
  description: string | null;
  customer_name: string | null;
  job_type: string | null;
  section: string | null;
  contract_value: number | null;
  timing: string | null;
  close_date: string | null;
  po_number: string | null;
  taxable: string | null;
  general_contractor: string | null;
  project_manager: string | null;
  status: "open" | "closed" | "written_up";
  is_hidden: boolean;
  has_folder: boolean;
  folder_name: string | null;
  source_row: number;
  source_sheet: string;
}

interface SyncPayload {
  source_file: string;
  file_modified: string;
  jobs: JobPayload[];
  folders: string[];
}

const VALID_STATUSES = ["open", "closed", "written_up"] as const;

function isValidJob(j: unknown): j is JobPayload {
  if (!j || typeof j !== "object") return false;
  const job = j as Record<string, unknown>;
  return (
    typeof job.job_number === "string" &&
    job.job_number.length > 0 &&
    typeof job.year === "number" &&
    typeof job.source_row === "number" &&
    typeof job.source_sheet === "string" &&
    VALID_STATUSES.includes(job.status as (typeof VALID_STATUSES)[number])
  );
}

// ── Data quality checks ────────────────────────────────

interface QualityFlag {
  job_number: string;
  flag_type: string;
  message: string;
}

function levenshteinClose(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 2) return false;
  let diff = 0;
  const maxLen = Math.max(a.length, b.length);
  for (let i = 0; i < maxLen; i++) {
    if (a[i] !== b[i]) diff++;
    if (diff > 2) return false;
  }
  return diff <= 2;
}

function runQualityChecks(jobs: JobPayload[]): QualityFlag[] {
  const flags: QualityFlag[] = [];

  for (const job of jobs) {
    if (job.is_hidden) continue;

    // missing_description
    if (!job.description || job.description.trim() === "") {
      flags.push({
        job_number: job.job_number,
        flag_type: "missing_description",
        message: `Job ${job.job_number} has no description`,
      });
    }

    // missing_po — exclude T&M maintenance jobs
    if (
      (!job.po_number || job.po_number.trim() === "") &&
      job.section !== "T&M"
    ) {
      flags.push({
        job_number: job.job_number,
        flag_type: "missing_po",
        message: `Job ${job.job_number} has no PO number`,
      });
    }

    // no_folder
    if (!job.has_folder && job.status !== "open") {
      flags.push({
        job_number: job.job_number,
        flag_type: "no_folder",
        message: `Job ${job.job_number} (${job.status}) has no matching Awarded Contracts folder`,
      });
    }
  }

  // duplicate_customer — fuzzy check
  const customerNames = [
    ...new Set(
      jobs
        .filter((j) => j.customer_name && !j.is_hidden)
        .map((j) => j.customer_name!)
    ),
  ];
  for (let i = 0; i < customerNames.length; i++) {
    for (let j = i + 1; j < customerNames.length; j++) {
      const a = customerNames[i].toLowerCase().replace(/[^a-z0-9]/g, "");
      const b = customerNames[j].toLowerCase().replace(/[^a-z0-9]/g, "");
      if (a !== b && a.length > 3 && b.length > 3) {
        if (
          (a.startsWith(b) || b.startsWith(a)) ||
          (Math.abs(a.length - b.length) <= 2 && levenshteinClose(a, b))
        ) {
          flags.push({
            job_number: "",
            flag_type: "duplicate_customer",
            message: `Possible duplicate: "${customerNames[i]}" vs "${customerNames[j]}"`,
          });
        }
      }
    }
  }

  return flags;
}

// ── POST handler ───────────────────────────────────────

export const POST: APIRoute = async ({ request }) => {
  if (!isSyncKeyValid(request)) {
    return new Response(
      JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }),
      { status: 401, headers: SECURITY_HEADERS }
    );
  }

  const { url: postgresUrl } = getPostgresEnv();
  if (!postgresUrl) {
    return new Response(
      JSON.stringify({ error: "Database not configured", code: "INTERNAL_ERROR" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }

  const startTime = Date.now();

  try {
    const body = (await request.json()) as Partial<SyncPayload>;

    if (!body.jobs || !Array.isArray(body.jobs)) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'jobs' array", code: "BAD_REQUEST" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    const errors: string[] = [];
    const validJobs: JobPayload[] = [];
    for (let i = 0; i < body.jobs.length; i++) {
      if (isValidJob(body.jobs[i])) {
        validJobs.push(body.jobs[i] as JobPayload);
      } else {
        errors.push(`Job at index ${i} failed validation`);
      }
    }

    let created = 0;
    let updated = 0;

    for (const job of validJobs) {
      const result = await sql.query(
        `INSERT INTO jobs (
          job_number, year, description, customer_name, job_type, section,
          contract_value, timing, close_date, po_number, taxable,
          general_contractor, project_manager, status, is_hidden,
          has_folder, folder_name, source_row, source_sheet, synced_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,NOW())
        ON CONFLICT (job_number) DO UPDATE SET
          year = EXCLUDED.year,
          description = EXCLUDED.description,
          customer_name = EXCLUDED.customer_name,
          job_type = EXCLUDED.job_type,
          section = EXCLUDED.section,
          contract_value = EXCLUDED.contract_value,
          timing = EXCLUDED.timing,
          close_date = EXCLUDED.close_date,
          po_number = EXCLUDED.po_number,
          taxable = EXCLUDED.taxable,
          general_contractor = EXCLUDED.general_contractor,
          project_manager = EXCLUDED.project_manager,
          status = EXCLUDED.status,
          is_hidden = EXCLUDED.is_hidden,
          has_folder = EXCLUDED.has_folder,
          folder_name = EXCLUDED.folder_name,
          source_row = EXCLUDED.source_row,
          source_sheet = EXCLUDED.source_sheet,
          synced_at = NOW()
        RETURNING (xmax = 0) AS is_insert`,
        [
          job.job_number, job.year, job.description, job.customer_name,
          job.job_type, job.section, job.contract_value, job.timing,
          job.close_date, job.po_number, job.taxable, job.general_contractor,
          job.project_manager, job.status, job.is_hidden, job.has_folder,
          job.folder_name, job.source_row, job.source_sheet,
        ]
      );

      if (result.rows[0]?.is_insert) {
        created++;
      } else {
        updated++;
      }
    }

    const unchanged = Math.max(0, validJobs.length - created - updated);

    // Run quality checks and refresh flags
    const qualityFlags = runQualityChecks(validJobs);
    await sql`DELETE FROM job_flags WHERE resolved = false`;

    for (const flag of qualityFlags) {
      if (flag.job_number) {
        const jobRow = await sql.query(
          `SELECT id FROM jobs WHERE job_number = $1`,
          [flag.job_number]
        );
        if (jobRow.rows[0]) {
          await sql.query(
            `INSERT INTO job_flags (job_id, flag_type, message) VALUES ($1, $2, $3)`,
            [jobRow.rows[0].id, flag.flag_type, flag.message]
          );
        }
      } else {
        await sql.query(
          `INSERT INTO job_flags (flag_type, message) VALUES ($1, $2)`,
          [flag.flag_type, flag.message]
        );
      }
    }

    // Log sync run
    const durationMs = Date.now() - startTime;
    const syncLog = await sql.query(
      `INSERT INTO sync_log (
        sync_type, source_file, file_modified, jobs_total, jobs_created,
        jobs_updated, jobs_unchanged, errors, duration_ms, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id`,
      [
        "full",
        body.source_file ?? null,
        body.file_modified ?? null,
        validJobs.length,
        created,
        updated,
        unchanged,
        errors.length > 0 ? JSON.stringify(errors) : null,
        durationMs,
        errors.length > 0 ? "partial" : "success",
      ]
    );

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: validJobs.length,
          created,
          updated,
          unchanged,
          flags: qualityFlags.length,
        },
        sync_id: syncLog.rows[0]?.id ?? null,
      }),
      { status: 200, headers: SECURITY_HEADERS }
    );
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error(
      "Sync jobs error:",
      error instanceof Error ? error.message : "Unknown error"
    );

    try {
      await sql.query(
        `INSERT INTO sync_log (sync_type, duration_ms, status, errors)
         VALUES ($1, $2, $3, $4)`,
        [
          "full",
          durationMs,
          "failed",
          JSON.stringify([error instanceof Error ? error.message : "Unknown error"]),
        ]
      );
    } catch {
      // Can't log the failure — just continue
    }

    return new Response(
      JSON.stringify({ error: "Internal server error", code: "INTERNAL_ERROR" }),
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
};
