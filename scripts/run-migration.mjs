// Run a SQL migration file against Vercel Postgres
// Usage: node scripts/run-migration.mjs migrations/001_add_contact_status.sql

import { readFileSync } from "fs";
import { sql } from "@vercel/postgres";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/run-migration.mjs <migration-file.sql>");
  process.exit(1);
}

const migration = readFileSync(file, "utf-8");

// Remove SQL comment lines, then split on semicolons
const cleaned = migration
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n");

const statements = cleaned
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

console.log(`Running migration: ${file}`);
console.log(`Found ${statements.length} statements`);

for (const stmt of statements) {
  const preview = stmt.substring(0, 80).replace(/\n/g, " ");
  console.log(`  Executing: ${preview}...`);
  try {
    await sql.query(stmt);
    console.log("  OK");
  } catch (err) {
    console.error(`  FAILED: ${err.message}`);
    process.exit(1);
  }
}

console.log("Migration complete!");
