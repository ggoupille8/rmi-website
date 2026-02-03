/**
 * Vitest test setup file
 *
 * This file is run before each test file
 */

import { vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";

// Cleanup after each test for React Testing Library
afterEach(() => {
  cleanup();
});

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Mock environment variables for tests
vi.stubEnv("NODE_ENV", "test");

// Mock window.location for component tests
Object.defineProperty(window, "location", {
  value: {
    href: "http://localhost:4321/",
    pathname: "/",
    search: "",
    hash: "",
    origin: "http://localhost:4321",
  },
  writable: true,
});

// Mock window.history for component tests
Object.defineProperty(window, "history", {
  value: {
    replaceState: vi.fn(),
    pushState: vi.fn(),
  },
  writable: true,
});

// Suppress console output during tests (optional)
// Uncomment to reduce noise in test output
// vi.spyOn(console, 'log').mockImplementation(() => {});
// vi.spyOn(console, 'warn').mockImplementation(() => {});
// vi.spyOn(console, 'error').mockImplementation(() => {});
