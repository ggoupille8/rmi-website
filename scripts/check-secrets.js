#!/usr/bin/env node
/**
 * Secret detection script for pre-commit and CI
 * Checks for common secret patterns in tracked files
 */

import { readFileSync } from "fs";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..");

// Patterns that indicate secrets (case-insensitive)
const SECRET_PATTERNS = [
  // SendGrid API keys start with SG.
  /SG\.[a-zA-Z0-9_-]{20,}/i,
  // Vercel tokens
  /VERCEL_TOKEN\s*=\s*[a-zA-Z0-9_-]{20,}/i,
  // Generic API keys (common patterns)
  /(api[_-]?key|apikey)\s*=\s*['"]?[a-zA-Z0-9_-]{32,}['"]?/i,
  // AWS keys
  /AWS[_-]?(SECRET[_-]?ACCESS[_-]?KEY|ACCESS[_-]?KEY[_-]?ID)\s*=\s*['"]?[A-Za-z0-9/+=]{20,}['"]?/i,
  // Database URLs with passwords
  /postgres:\/\/[^:]+:[^@]+@/i,
  /mysql:\/\/[^:]+:[^@]+@/i,
  // Private keys
  /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/i,
];

// Files to exclude from checks (already ignored or safe)
const EXCLUDE_PATTERNS = [
  /\.env\.example$/,
  /\.git\//,
  /node_modules\//,
  /dist\//,
  /\.astro\//,
  /test-results\//,
  /playwright-report\//,
];

function isExcluded(filePath) {
  return EXCLUDE_PATTERNS.some((pattern) => pattern.test(filePath));
}

function checkFile(fileInfo) {
  const filePath = fileInfo.absolute;
  const relativePath = fileInfo.relative;
  
  if (isExcluded(filePath)) {
    return { violations: [] };
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    const violations = [];

    lines.forEach((line, index) => {
      SECRET_PATTERNS.forEach((pattern) => {
        if (pattern.test(line)) {
          // Mask the secret in output (show first 8 chars + ...)
          const match = line.match(pattern);
          const masked = match
            ? match[0].substring(0, 8) + "...[REDACTED]"
            : "[REDACTED]";
          violations.push({
            file: relativePath,
            line: index + 1,
            pattern: pattern.toString(),
            preview: masked,
          });
        }
      });
    });

    return { violations };
  } catch (error) {
    // File might not exist or be binary - skip
    return { violations: [] };
  }
}

function getTrackedFiles() {
  try {
    const output = execSync("git ls-files", {
      cwd: repoRoot,
      encoding: "utf-8",
    });
    return output
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => ({
        relative: line,
        absolute: join(repoRoot, line),
      }));
  } catch (error) {
    console.error("Error getting tracked files:", error.message);
    process.exit(1);
  }
}

function main() {
  const files = getTrackedFiles();
  const allViolations = [];

  files.forEach((file) => {
    const result = checkFile(file);
    allViolations.push(...result.violations);
  });

  if (allViolations.length > 0) {
    console.error("\n❌ SECRET DETECTION FAILED");
    console.error("Found potential secrets in tracked files:\n");
    allViolations.forEach((violation) => {
      console.error(
        `  ${violation.file}:${violation.line} - ${violation.preview}`
      );
    });
    console.error(
      "\n⚠️  DO NOT COMMIT SECRETS. Remove secrets from code and use environment variables instead."
    );
    process.exit(1);
  }

  console.log("✅ No secrets detected in tracked files");
  process.exit(0);
}

main();

