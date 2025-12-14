/**
 * Helper script to verify runtime configuration in generated Vercel function configs.
 * Use this to test if fix-runtime.js is still needed.
 *
 * Usage:
 *   npm run build
 *   node scripts/test-runtime-config.js
 */

import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";

const OUTPUT_DIR = ".vercel/output/functions";
const TARGET_RUNTIME = "nodejs20.x";
const CONFIG_FILE = ".vc-config.json";

function findConfigFiles(dir, fileList = []) {
  if (!existsSync(dir)) {
    return fileList;
  }

  const files = readdirSync(dir);
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      findConfigFiles(filePath, fileList);
    } else if (file === CONFIG_FILE) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

console.log(
  "🔍 Checking runtime configuration in generated function configs...\n"
);

const configFiles = findConfigFiles(OUTPUT_DIR);

if (configFiles.length === 0) {
  console.error("❌ No .vc-config.json files found.");
  console.error("   Run 'npm run build' first to generate function configs.");
  process.exit(1);
}

let allCorrect = true;
let issues = [];

for (const configPath of configFiles) {
  try {
    const config = JSON.parse(readFileSync(configPath, "utf-8"));
    const runtime = config.runtime;

    if (runtime === TARGET_RUNTIME) {
      console.log(`✅ ${configPath}: ${runtime}`);
    } else {
      console.error(
        `❌ ${configPath}: ${
          runtime || "missing"
        } (expected: ${TARGET_RUNTIME})`
      );
      allCorrect = false;
      issues.push({ path: configPath, runtime });
    }
  } catch (error) {
    console.error(`❌ ${configPath}: Error reading config - ${error.message}`);
    allCorrect = false;
    issues.push({ path: configPath, error: error.message });
  }
}

console.log("\n" + "=".repeat(60));

if (allCorrect) {
  console.log(
    `\n✅ All ${configFiles.length} function(s) using correct runtime: ${TARGET_RUNTIME}`
  );
  console.log(
    "\n💡 If this is consistent across builds, you may be able to remove fix-runtime.js"
  );
  console.log("   See DEPLOYMENT.md for testing procedure.");
  process.exit(0);
} else {
  console.log(`\n❌ Found ${issues.length} function(s) with incorrect runtime`);
  console.log("\n⚠️  fix-runtime.js is still needed to correct these configs.");
  console.log("   Ensure:");
  console.log("   1. Vercel Project Node.js Version is set to 20.x");
  console.log(
    "   2. Local Node.js version is 20.x (check with 'node --version')"
  );
  console.log("   3. package.json engines.node is '20.x'");
  process.exit(1);
}
