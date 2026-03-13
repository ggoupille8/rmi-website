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
      SELECT * FROM clients ORDER BY sort_order, id
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
    const {
      name, domain, color, description, seo_value, sort_order,
      logo_url, logo_type, is_featured, display_scale, needs_invert,
    } = body as {
      name?: string;
      domain?: string;
      color?: string;
      description?: string;
      seo_value?: number;
      sort_order?: number;
      logo_url?: string;
      logo_type?: string;
      is_featured?: boolean;
      display_scale?: number;
      needs_invert?: boolean;
    };

    if (!name || !domain) {
      return new Response(
        JSON.stringify({ error: "name and domain required" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    const colorVal = color ?? "#0066CC";
    const descVal = description ?? "";
    const seoVal = seo_value ?? 70;
    const sortVal = sort_order ?? 0;
    const logoUrlVal = logo_url ?? null;
    const logoTypeVal = logo_type ?? "svg";
    const isFeaturedVal = is_featured ?? false;
    const displayScaleVal = display_scale ?? 1.0;
    const needsInvertVal = needs_invert ?? true;

    const result = await sql`
      INSERT INTO clients (name, domain, color, description, seo_value, sort_order,
                           logo_url, logo_type, is_featured, display_scale, needs_invert)
      VALUES (${name}, ${domain}, ${colorVal}, ${descVal}, ${seoVal}, ${sortVal},
              ${logoUrlVal}, ${logoTypeVal}, ${isFeaturedVal}, ${displayScaleVal}, ${needsInvertVal})
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
    const {
      id, name, domain, color, description, seo_value, sort_order, active,
      logo_url, logo_type, is_featured, display_scale, needs_invert,
    } = body as {
      id?: number;
      name?: string;
      domain?: string;
      color?: string;
      description?: string;
      seo_value?: number;
      sort_order?: number;
      active?: boolean;
      logo_url?: string | null;
      logo_type?: string;
      is_featured?: boolean;
      display_scale?: number;
      needs_invert?: boolean;
    };

    if (!id) {
      return new Response(
        JSON.stringify({ error: "id required" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

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
    const newSeo = seo_value ?? row.seo_value;
    const newSort = sort_order ?? row.sort_order;
    const newActive = active ?? row.active;
    const newLogoUrl = logo_url === null ? null : (logo_url ?? row.logo_url);
    const newLogoType = logo_type ?? row.logo_type ?? "svg";
    const newIsFeatured = is_featured ?? row.is_featured ?? false;
    const newDisplayScale = display_scale ?? row.display_scale ?? 1.0;
    const newNeedsInvert = needs_invert ?? row.needs_invert ?? true;

    const result = await sql`
      UPDATE clients SET
        name = ${newName},
        domain = ${newDomain},
        color = ${newColor},
        description = ${newDesc},
        seo_value = ${newSeo},
        sort_order = ${newSort},
        active = ${newActive},
        logo_url = ${newLogoUrl},
        logo_type = ${newLogoType},
        is_featured = ${newIsFeatured},
        display_scale = ${newDisplayScale},
        needs_invert = ${newNeedsInvert},
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
