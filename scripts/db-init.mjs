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

  const schemaPath = path.resolve(__dirname, "..", "schema.sql");
  const schemaRaw = fs.readFileSync(schemaPath, "utf8");
  const cleaned = stripSqlComments(schemaRaw);
  const statements = splitStatements(cleaned);

  if (statements.length === 0) {
    console.log("OK");
    return;
  }

  for (let i = 0; i < statements.length; i += 1) {
    await sql.query(statements[i]);
    console.log(`OK ${i + 1}/${statements.length}`);
  }
}

run().catch((error) => {
  const message =
    error instanceof Error ? error.message : "Unknown error running db init";
  console.error(message);
  process.exit(1);
});
