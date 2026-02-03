import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// We need to mock the module before importing
// Because getPostgresEnv reads from process.env and import.meta.env

describe("getPostgresEnv", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear relevant env vars before each test
    delete process.env.POSTGRES_URL;
    delete process.env.DATABASE_URL;
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it("returns POSTGRES_URL when set", async () => {
    process.env.POSTGRES_URL = "postgres://localhost:5432/testdb";

    const { getPostgresEnv } = await import("../db-env");
    const result = getPostgresEnv();

    expect(result.url).toBe("postgres://localhost:5432/testdb");
    expect(result.source).toBe("POSTGRES_URL");
  });

  it("returns DATABASE_URL as fallback when POSTGRES_URL is not set", async () => {
    process.env.DATABASE_URL = "postgres://localhost:5432/fallbackdb";

    const { getPostgresEnv } = await import("../db-env");
    const result = getPostgresEnv();

    expect(result.url).toBe("postgres://localhost:5432/fallbackdb");
    expect(result.source).toBe("DATABASE_URL");
  });

  it("prefers POSTGRES_URL over DATABASE_URL", async () => {
    process.env.POSTGRES_URL = "postgres://localhost:5432/primary";
    process.env.DATABASE_URL = "postgres://localhost:5432/secondary";

    const { getPostgresEnv } = await import("../db-env");
    const result = getPostgresEnv();

    expect(result.url).toBe("postgres://localhost:5432/primary");
    expect(result.source).toBe("POSTGRES_URL");
  });

  it("returns null when no database URL is configured", async () => {
    const { getPostgresEnv } = await import("../db-env");
    const result = getPostgresEnv();

    expect(result.url).toBeNull();
    expect(result.source).toBeNull();
  });

  it("ignores empty string POSTGRES_URL", async () => {
    process.env.POSTGRES_URL = "";
    process.env.DATABASE_URL = "postgres://localhost:5432/fallback";

    const { getPostgresEnv } = await import("../db-env");
    const result = getPostgresEnv();

    expect(result.url).toBe("postgres://localhost:5432/fallback");
    expect(result.source).toBe("DATABASE_URL");
  });

  it("ignores whitespace-only POSTGRES_URL", async () => {
    process.env.POSTGRES_URL = "   ";
    process.env.DATABASE_URL = "postgres://localhost:5432/fallback";

    const { getPostgresEnv } = await import("../db-env");
    const result = getPostgresEnv();

    expect(result.url).toBe("postgres://localhost:5432/fallback");
    expect(result.source).toBe("DATABASE_URL");
  });

  it("ignores empty string DATABASE_URL when POSTGRES_URL also empty", async () => {
    process.env.POSTGRES_URL = "";
    process.env.DATABASE_URL = "";

    const { getPostgresEnv } = await import("../db-env");
    const result = getPostgresEnv();

    expect(result.url).toBeNull();
    expect(result.source).toBeNull();
  });

  it("sets process.env.POSTGRES_URL from DATABASE_URL for compatibility", async () => {
    process.env.DATABASE_URL = "postgres://localhost:5432/fromdb";

    const { getPostgresEnv } = await import("../db-env");
    getPostgresEnv();

    // The function should set POSTGRES_URL for libraries that expect it
    expect(process.env.POSTGRES_URL).toBe("postgres://localhost:5432/fromdb");
  });
});
