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
  return new Response(JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }), {
    status: 401,
    headers: {
      ...SECURITY_HEADERS,
      "WWW-Authenticate": 'Bearer realm="admin"',
    },
  });
}

function dbNotConfiguredResponse(): Response {
  return new Response(
    JSON.stringify({ error: "Database not configured", code: "INTERNAL_ERROR" }),
    { status: 500, headers: SECURITY_HEADERS }
  );
}

/**
 * GET /api/admin/materials-search?q={query}&vendor={vendorCode}
 *
 * Searches materials by description (AND-matching all words).
 * Optionally joins vendor pricing when vendor code is provided.
 * Returns top 20 results sorted by relevance (exact > partial).
 */
export const GET: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) return unauthorizedResponse();

  const { url: postgresUrl } = getPostgresEnv();
  if (!postgresUrl) return dbNotConfiguredResponse();

  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim();
    const vendorCode = url.searchParams.get("vendor")?.trim();

    if (!query || query.length < 1) {
      return new Response(
        JSON.stringify({ error: "Query parameter 'q' is required", code: "BAD_REQUEST" }),
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Split query into words for AND-matching
    const words = query.split(/\s+/).filter((w) => w.length > 0);
    if (words.length === 0) {
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: SECURITY_HEADERS }
      );
    }

    // Build ILIKE conditions — all words must appear in description
    // Use parameterized patterns to prevent SQL injection
    const likePatterns = words.map((w) => `%${w}%`);

    let result;

    if (vendorCode) {
      // Join with vendor pricing
      // Build dynamic WHERE with AND conditions for each word
      if (likePatterns.length === 1) {
        result = await sql`
          SELECT
            m.id,
            m.description,
            m.unit,
            m.tax_category AS "taxCategory",
            mp.price AS "vendorPrice",
            mp.price_date AS "vendorPriceDate",
            mp.book_price AS "bookPrice",
            CASE WHEN m.description ILIKE ${query} THEN 0 ELSE 1 END AS sort_rank
          FROM materials m
          LEFT JOIN vendors v ON v.code = ${vendorCode}
          LEFT JOIN material_prices mp ON mp.material_id = m.id AND mp.vendor_id = v.id
          WHERE m.description ILIKE ${likePatterns[0]}
          ORDER BY sort_rank, m.description
          LIMIT 20
        `;
      } else if (likePatterns.length === 2) {
        result = await sql`
          SELECT
            m.id,
            m.description,
            m.unit,
            m.tax_category AS "taxCategory",
            mp.price AS "vendorPrice",
            mp.price_date AS "vendorPriceDate",
            mp.book_price AS "bookPrice",
            CASE WHEN m.description ILIKE ${query} THEN 0 ELSE 1 END AS sort_rank
          FROM materials m
          LEFT JOIN vendors v ON v.code = ${vendorCode}
          LEFT JOIN material_prices mp ON mp.material_id = m.id AND mp.vendor_id = v.id
          WHERE m.description ILIKE ${likePatterns[0]}
            AND m.description ILIKE ${likePatterns[1]}
          ORDER BY sort_rank, m.description
          LIMIT 20
        `;
      } else if (likePatterns.length === 3) {
        result = await sql`
          SELECT
            m.id,
            m.description,
            m.unit,
            m.tax_category AS "taxCategory",
            mp.price AS "vendorPrice",
            mp.price_date AS "vendorPriceDate",
            mp.book_price AS "bookPrice",
            CASE WHEN m.description ILIKE ${query} THEN 0 ELSE 1 END AS sort_rank
          FROM materials m
          LEFT JOIN vendors v ON v.code = ${vendorCode}
          LEFT JOIN material_prices mp ON mp.material_id = m.id AND mp.vendor_id = v.id
          WHERE m.description ILIKE ${likePatterns[0]}
            AND m.description ILIKE ${likePatterns[1]}
            AND m.description ILIKE ${likePatterns[2]}
          ORDER BY sort_rank, m.description
          LIMIT 20
        `;
      } else {
        // 4+ words: use first 4 for ILIKE (practical limit for template literals)
        result = await sql`
          SELECT
            m.id,
            m.description,
            m.unit,
            m.tax_category AS "taxCategory",
            mp.price AS "vendorPrice",
            mp.price_date AS "vendorPriceDate",
            mp.book_price AS "bookPrice",
            CASE WHEN m.description ILIKE ${query} THEN 0 ELSE 1 END AS sort_rank
          FROM materials m
          LEFT JOIN vendors v ON v.code = ${vendorCode}
          LEFT JOIN material_prices mp ON mp.material_id = m.id AND mp.vendor_id = v.id
          WHERE m.description ILIKE ${likePatterns[0]}
            AND m.description ILIKE ${likePatterns[1]}
            AND m.description ILIKE ${likePatterns[2]}
            AND m.description ILIKE ${likePatterns[3]}
          ORDER BY sort_rank, m.description
          LIMIT 20
        `;
      }
    } else {
      // No vendor — just search materials
      if (likePatterns.length === 1) {
        result = await sql`
          SELECT
            m.id,
            m.description,
            m.unit,
            m.tax_category AS "taxCategory",
            CASE WHEN m.description ILIKE ${query} THEN 0 ELSE 1 END AS sort_rank
          FROM materials m
          WHERE m.description ILIKE ${likePatterns[0]}
          ORDER BY sort_rank, m.description
          LIMIT 20
        `;
      } else if (likePatterns.length === 2) {
        result = await sql`
          SELECT
            m.id,
            m.description,
            m.unit,
            m.tax_category AS "taxCategory",
            CASE WHEN m.description ILIKE ${query} THEN 0 ELSE 1 END AS sort_rank
          FROM materials m
          WHERE m.description ILIKE ${likePatterns[0]}
            AND m.description ILIKE ${likePatterns[1]}
          ORDER BY sort_rank, m.description
          LIMIT 20
        `;
      } else if (likePatterns.length === 3) {
        result = await sql`
          SELECT
            m.id,
            m.description,
            m.unit,
            m.tax_category AS "taxCategory",
            CASE WHEN m.description ILIKE ${query} THEN 0 ELSE 1 END AS sort_rank
          FROM materials m
          WHERE m.description ILIKE ${likePatterns[0]}
            AND m.description ILIKE ${likePatterns[1]}
            AND m.description ILIKE ${likePatterns[2]}
          ORDER BY sort_rank, m.description
          LIMIT 20
        `;
      } else {
        result = await sql`
          SELECT
            m.id,
            m.description,
            m.unit,
            m.tax_category AS "taxCategory",
            CASE WHEN m.description ILIKE ${query} THEN 0 ELSE 1 END AS sort_rank
          FROM materials m
          WHERE m.description ILIKE ${likePatterns[0]}
            AND m.description ILIKE ${likePatterns[1]}
            AND m.description ILIKE ${likePatterns[2]}
            AND m.description ILIKE ${likePatterns[3]}
          ORDER BY sort_rank, m.description
          LIMIT 20
        `;
      }
    }

    // Strip sort_rank from response
    const results = result.rows.map(({ sort_rank: _rank, ...rest }) => rest);

    return new Response(JSON.stringify({ results }), {
      headers: SECURITY_HEADERS,
    });
  } catch (error) {
    console.error(
      "Materials search error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(JSON.stringify({ error: "Internal server error", code: "INTERNAL_ERROR" }), {
      status: 500,
      headers: SECURITY_HEADERS,
    });
  }
};
