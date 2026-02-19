import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { sql } from "@vercel/postgres";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (!key) {
      continue;
    }

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function stripSqlComments(sqlText) {
  const withoutBlock = sqlText.replace(/\/\*[\s\S]*?\*\//g, "");
  const lines = withoutBlock.split(/\r?\n/);
  return lines
    .map((line) => line.replace(/--.*$/g, "").trim())
    .filter(Boolean)
    .join("\n");
}

function splitStatements(sqlText) {
  const statements = [];
  let buffer = "";

  for (const line of sqlText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    buffer = buffer ? `${buffer}\n${trimmed}` : trimmed;
    if (trimmed.endsWith(";")) {
      statements.push(buffer.slice(0, -1).trim());
      buffer = "";
    }
  }

  if (buffer.trim()) {
    statements.push(buffer.trim());
  }

  return statements;
}

async function run() {
  const migrationFile = process.argv[2];
  if (!migrationFile) {
    console.error("Usage: node scripts/db-migrate.mjs <migration-file.sql>");
    process.exit(1);
  }

  const envPath = path.resolve(process.cwd(), ".env.local");
  loadEnvFile(envPath);
  const fallbackEnvPath = path.resolve(process.cwd(), ".env");
  loadEnvFile(fallbackEnvPath);

  if (!process.env.POSTGRES_URL && process.env.POSTGRES_PRISMA_URL) {
    process.env.POSTGRES_URL = process.env.POSTGRES_PRISMA_URL;
  }
  if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) {
    process.env.POSTGRES_URL = process.env.DATABASE_URL;
  }

  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL is not set");
  }

  const migrationPath = path.resolve(process.cwd(), migrationFile);
  if (!fs.existsSync(migrationPath)) {
    throw new Error(`Migration file not found: ${migrationPath}`);
  }

  const schemaRaw = fs.readFileSync(migrationPath, "utf8");
  const cleaned = stripSqlComments(schemaRaw);
  const statements = splitStatements(cleaned);

  if (statements.length === 0) {
    console.log("No statements to run.");
    return;
  }

  console.log(`Running migration: ${migrationFile}`);
  console.log(`Statements: ${statements.length}`);

  for (let i = 0; i < statements.length; i += 1) {
    console.log(`  [${i + 1}/${statements.length}] ${statements[i].slice(0, 80)}...`);
    await sql.query(statements[i]);
    console.log(`  OK`);
  }

  console.log("Migration complete.");
}

run().catch((error) => {
  const message =
    error instanceof Error ? error.message : "Unknown error running migration";
  console.error(`Migration failed: ${message}`);
  process.exit(1);
});
