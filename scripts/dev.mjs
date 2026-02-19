import { spawn, execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";

// ── ANSI codes ──────────────────────────────────────────────
const blue = "\x1b[34m";
const green = "\x1b[32m";
const dim = "\x1b[2m";
const reset = "\x1b[0m";
const bold = "\x1b[1m";

// ── Detect Astro version ────────────────────────────────────
let astroVersion = "unknown";
try {
  const pkg = JSON.parse(
    readFileSync(new URL("../node_modules/astro/package.json", import.meta.url), "utf8")
  );
  astroVersion = pkg.version;
} catch {}

// ── Noise filter ────────────────────────────────────────────
const NOISE = [
  /\[types\] Generated/,
  /\[watch\]/,
  /\[db-env-log\]/,
  /Re-optimizing dependencies/,
  /^\s*$/,
];

function isNoise(line) {
  return NOISE.some((re) => re.test(line));
}

// ── Banner ──────────────────────────────────────────────────
const startedAt = new Date().toLocaleTimeString();

function printBanner(status) {
  const statusLine =
    status === "starting"
      ? `${dim}Status:  Starting...${reset}`
      : `${green}${bold}Status:  ✓ ${status}${reset}`;

  const lines = [
    ``,
    `  ${blue}${bold}┌─────────────────────────────────────────────┐${reset}`,
    `  ${blue}${bold}│${reset}   ${blue}${bold}RMI — Development Server${reset}                  ${blue}${bold}│${reset}`,
    `  ${blue}${bold}│${reset}   ${green}Local:   http://localhost:4321${reset}            ${blue}${bold}│${reset}`,
    `  ${blue}${bold}│${reset}   ${dim}Astro:   v${astroVersion}${reset}${" ".repeat(Math.max(0, 28 - astroVersion.length - 1))}${blue}${bold}│${reset}`,
    `  ${blue}${bold}│${reset}   ${dim}Started: ${startedAt}${reset}${" ".repeat(Math.max(0, 28 - startedAt.length + 1))}${blue}${bold}│${reset}`,
    `  ${blue}${bold}│${reset}   ${statusLine}${" ".repeat(Math.max(0, 45 - stripAnsi(statusLine).length - 3))}${blue}${bold}│${reset}`,
    `  ${blue}${bold}└─────────────────────────────────────────────┘${reset}`,
    ``,
  ];
  console.clear();
  console.log(lines.join("\n"));
}

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

// ── Phase 1: Free ports ─────────────────────────────────────
printBanner("starting");

const portsFree = spawn(
  "powershell",
  ["-ExecutionPolicy", "Bypass", "-File", "scripts/ports-free.ps1"],
  { stdio: "pipe", shell: false }
);

portsFree.stdout.on("data", (d) => {
  const line = d.toString().trim();
  if (line) process.stdout.write(`${dim}  [ports] ${line}${reset}\n`);
});

portsFree.stderr.on("data", (d) => {
  process.stderr.write(`${dim}  [ports] ${d}${reset}`);
});

portsFree.on("close", (code) => {
  if (code !== 0) {
    console.error(`\n  ports-free exited with code ${code}, continuing anyway...\n`);
  }
  startAstro();
});

// ── Phase 2: Astro dev ──────────────────────────────────────
function startAstro() {
  const astro = spawn("npx", ["astro", "dev"], {
    stdio: ["inherit", "pipe", "pipe"],
    shell: true,
  });

  let readyFired = false;

  function handleLine(line) {
    // Detect the "ready in" message
    const readyMatch = line.match(/ready in (\d+[\.\d]*\s*m?s)/i);
    if (readyMatch && !readyFired) {
      readyFired = true;
      printBanner(`Ready in ${readyMatch[1]}`);
      return;
    }

    // Filter noise
    if (isNoise(line)) return;

    // Pass through errors and important messages
    if (/error/i.test(line)) {
      process.stdout.write(`  ${line}\n`);
    } else if (readyFired) {
      // After ready, only show meaningful output
      process.stdout.write(`${dim}  ${line}${reset}\n`);
    }
  }

  const rlOut = createInterface({ input: astro.stdout });
  rlOut.on("line", handleLine);

  const rlErr = createInterface({ input: astro.stderr });
  rlErr.on("line", handleLine);

  astro.on("close", (code) => {
    process.exit(code ?? 0);
  });

  // Forward signals
  process.on("SIGINT", () => astro.kill("SIGINT"));
  process.on("SIGTERM", () => astro.kill("SIGTERM"));
}
