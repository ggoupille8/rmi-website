import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Include unit tests from src directory
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // Exclude e2e tests (handled by Playwright)
    exclude: ["tests/**/*", "node_modules/**/*"],
    // Environment for React component tests
    // happy-dom is ESM-native — avoids the ERR_REQUIRE_ESM errors from jsdom 28's
    // CJS transitive deps (@exodus/bytes, parse5) that break vitest 4 forks pool.
    environment: "happy-dom",
    // Global test utilities
    globals: true,
    // Setup files
    setupFiles: ["./src/test/setup.ts"],
    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/lib/**/*.ts", "src/components/**/*.tsx"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
        "src/test/**/*",
        "node_modules/**/*",
      ],
    },
  },
});
