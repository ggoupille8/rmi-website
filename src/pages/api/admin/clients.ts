import type { APIRoute } from "astro";
import { sql } from "@vercel/postgres";
import { getPostgresEnv } from "../../../lib/db-env";
import { isAdminAuthorized } from "../../../lib/admin-auth";

export const prerender = false;

const SECURITY_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: {
      ...SECURITY_HEADERS,
      "WWW-Authenticate": 'Bearer realm="admin"',
    },
  });
}

function dbNotConfiguredResponse(): Response {
  return new Response(
    JSON.stringify({ error: "Database not configured" }),
    { status: 500, headers: SECURITY_HEADERS }
  );
}

export const GET: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) return unauthorizedResponse();

  const { url: postgresUrl } = getPostgresEnv();
  if (!postgresUrl) return dbNotConfiguredResponse();

  try {
    const result = await sql`
      SELECT * FROM clients ORDER BY tier, sort_order, id
    `;
    return new Response(JSON.stringify(result.rows), {
      headers: SECURITY_HEADERS,
    });
  } catch (error) {
    console.error("Admin clients fetch error:", error instanceof Error ? error.message : "Unknown error");
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: SECURITY_HEADERS,
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) return unauthorizedResponse();

  const { url: postgresUrl } = getPostgresEnv();
  if (!postgresUrl) return dbNotConfiguredResponse();

  try {
    const body = await request.json();
    const { name, domain, color, description, tier, seo_value, sort_order } = body as {
      name?: string;
      domain?: string;
      color?: string;
      description?: string;
      tier?: string;
      seo_value?: number;
      sort_order?: number;
    };

    if (!name || !domain || !tier) {
      return new Response(
        JSON.stringify({ error: "name, domain, tier required" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    if (!["high", "medium", "low"].includes(tier)) {
      return new Response(
        JSON.stringify({ error: "tier must be high, medium, or low" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    const colorVal = color ?? "#0066CC";
    const descVal = description ?? "";
    const seoVal = seo_value ?? 70;
    const sortVal = sort_order ?? 0;

    const result = await sql`
      INSERT INTO clients (name, domain, color, description, tier, seo_value, sort_order)
      VALUES (${name}, ${domain}, ${colorVal}, ${descVal}, ${tier}, ${seoVal}, ${sortVal})
      RETURNING *
    `;
    return new Response(JSON.stringify(result.rows[0]), {
      status: 201,
      headers: SECURITY_HEADERS,
    });
  } catch (error) {
    console.error("Admin clients create error:", error instanceof Error ? error.message : "Unknown error");
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: SECURITY_HEADERS,
    });
  }
};

export const PATCH: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) return unauthorizedResponse();

  const { url: postgresUrl } = getPostgresEnv();
  if (!postgresUrl) return dbNotConfiguredResponse();

  try {
    const body = await request.json();
    const { id, name, domain, color, description, tier, seo_value, sort_order, active } = body as {
      id?: number;
      name?: string;
      domain?: string;
      color?: string;
      description?: string;
      tier?: string;
      seo_value?: number;
      sort_order?: number;
      active?: boolean;
    };

    if (!id) {
      return new Response(
        JSON.stringify({ error: "id required" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    if (tier !== undefined && !["high", "medium", "low"].includes(tier)) {
      return new Response(
        JSON.stringify({ error: "tier must be high, medium, or low" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Build dynamic update — @vercel/postgres uses tagged templates,
    // so we handle each field individually via a full column update
    const current = await sql`SELECT * FROM clients WHERE id = ${id}`;
    if (current.rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Client not found" }),
        { status: 404, headers: SECURITY_HEADERS }
      );
    }

    const row = current.rows[0];
    const newName = name ?? row.name;
    const newDomain = domain ?? row.domain;
    const newColor = color ?? row.color;
    const newDesc = description ?? row.description;
    const newTier = tier ?? row.tier;
    const newSeo = seo_value ?? row.seo_value;
    const newSort = sort_order ?? row.sort_order;
    const newActive = active ?? row.active;

    const result = await sql`
      UPDATE clients SET
        name = ${newName},
        domain = ${newDomain},
        color = ${newColor},
        description = ${newDesc},
        tier = ${newTier},
        seo_value = ${newSeo},
        sort_order = ${newSort},
        active = ${newActive},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return new Response(JSON.stringify(result.rows[0]), {
      headers: SECURITY_HEADERS,
    });
  } catch (error) {
    console.error("Admin clients update error:", error instanceof Error ? error.message : "Unknown error");
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: SECURITY_HEADERS,
    });
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) return unauthorizedResponse();

  const { url: postgresUrl } = getPostgresEnv();
  if (!postgresUrl) return dbNotConfiguredResponse();

  try {
    const body = await request.json();
    const { id } = body as { id?: number };

    if (!id) {
      return new Response(
        JSON.stringify({ error: "id required" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    await sql`DELETE FROM clients WHERE id = ${id}`;
    return new Response(JSON.stringify({ deleted: id }), {
      headers: SECURITY_HEADERS,
    });
  } catch (error) {
    console.error("Admin clients delete error:", error instanceof Error ? error.message : "Unknown error");
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: SECURITY_HEADERS,
    });
  }
};
