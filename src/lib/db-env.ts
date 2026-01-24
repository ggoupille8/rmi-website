type PostgresEnvSource = "POSTGRES_URL" | "DATABASE_URL" | null;

export function getPostgresEnv(): { url: string | null; source: PostgresEnvSource } {
  const postgresUrl =
    process.env.POSTGRES_URL ?? import.meta.env.POSTGRES_URL;
  if (postgresUrl && postgresUrl.trim().length > 0) {
    if (!process.env.POSTGRES_URL) {
      process.env.POSTGRES_URL = postgresUrl;
    }
    return { url: postgresUrl, source: "POSTGRES_URL" };
  }

  const databaseUrl =
    process.env.DATABASE_URL ?? import.meta.env.DATABASE_URL;
  if (databaseUrl && databaseUrl.trim().length > 0) {
    if (!process.env.POSTGRES_URL) {
      process.env.POSTGRES_URL = databaseUrl;
    }
    return { url: databaseUrl, source: "DATABASE_URL" };
  }

  return { url: null, source: null };
}
