import type { APIRoute } from "astro";

export const prerender = false;

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

function verifyToken(request: Request): boolean {
  const token = request.headers.get("X-Sync-Token");
  const expected = import.meta.env.SYNC_TOKEN;
  if (!token || !expected || token !== expected) return false;
  return true;
}

export const GET: APIRoute = ({ request }) => {
  if (!verifyToken(request)) return unauthorized();

  return new Response(
    JSON.stringify({ message: "Sync agent integration pending" }),
    {
      status: 501,
      headers: { "Content-Type": "application/json" },
    }
  );
};
