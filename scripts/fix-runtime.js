import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  statSync,
} from "fs";
import { join } from "path";

/**
 * Post-build script to fix runtime in generated Vercel function configs.
 * The @astrojs/vercel adapter v7.8.2 ignores runtime setting when local Node version is unsupported.
 * This script ensures all functions use nodejs20.x runtime.
 */

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

function fixRuntimeConfig(configPath) {
  if (!existsSync(configPath)) {
    return false;
  }

  try {
    const config = JSON.parse(readFileSync(configPath, "utf-8"));

    if (config.runtime !== TARGET_RUNTIME) {
      config.runtime = TARGET_RUNTIME;
      writeFileSync(
        configPath,
        JSON.stringify(config, null, 2) + "\n",
        "utf-8"
      );
      console.log(`✓ Fixed runtime in ${configPath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error fixing ${configPath}:`, error.message);
    return false;
  }
}

// Find all .vc-config.json files in function directories
const configFiles = findConfigFiles(OUTPUT_DIR);

if (configFiles.length === 0) {
  console.log("No .vc-config.json files found. Build may not have completed.");
  process.exit(0);
}

let fixedCount = 0;
for (const configPath of configFiles) {
  if (fixRuntimeConfig(configPath)) {
    fixedCount++;
  }
}

if (fixedCount > 0) {
  console.log(
    `\n✓ Fixed runtime to ${TARGET_RUNTIME} in ${fixedCount} function(s)`
  );
} else {
  console.log(`\n✓ All functions already using ${TARGET_RUNTIME}`);
}
