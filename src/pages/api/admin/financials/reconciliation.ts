import type { APIRoute } from "astro";

export const prerender = false;

/**
 * Redirect /api/admin/financials/reconciliation?reportDate=...
 * to the canonical /api/admin/financials?action=reconciliation&reportDate=...
 *
 * This route exists because earlier specs referenced this URL directly,
 * and browsers / clients may still try to hit it.
 */
export const GET: APIRoute = async ({ url, request }) => {
  const reportDate = url.searchParams.get("reportDate") ?? "";
  const target = new URL("/api/admin/financials", url.origin);
  target.searchParams.set("action", "reconciliation");
  if (reportDate) target.searchParams.set("reportDate", reportDate);

  // Forward the auth header so the main handler can validate
  return fetch(target.toString(), {
    headers: { cookie: request.headers.get("cookie") ?? "", authorization: request.headers.get("authorization") ?? "" },
  });
};
