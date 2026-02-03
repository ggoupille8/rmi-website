import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Include unit tests from src directory
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // Exclude e2e tests (handled by Playwright)
    exclude: ["tests/**/*", "node_modules/**/*"],
    // Environment for React component tests
    environment: "jsdom",
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
