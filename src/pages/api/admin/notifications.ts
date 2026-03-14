import type { APIRoute } from "astro";
import { isAdminAuthorized } from "../../../lib/admin-auth";
import { getNotifications, getUnreadCount, markAsRead } from "../../../lib/admin-notifications";

export const prerender = false;

const HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

// GET — fetch notifications + unread count
export const GET: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }), { status: 401, headers: HEADERS });
  }

  try {
    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get("unread") === "true";
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);

    const [notifications, unreadCount] = await Promise.all([
      getNotifications(Math.min(limit, 50), unreadOnly),
      getUnreadCount(),
    ]);

    return new Response(
      JSON.stringify({ notifications, unreadCount }),
      { status: 200, headers: HEADERS }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to fetch notifications", code: "INTERNAL_ERROR" }),
      { status: 500, headers: HEADERS }
    );
  }
};

// PATCH — mark as read
export const PATCH: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }), { status: 401, headers: HEADERS });
  }

  try {
    const body = await request.json();
    const ids = body.ids as string[] | undefined;

    await markAsRead(ids);

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: HEADERS }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to mark as read", code: "INTERNAL_ERROR" }),
      { status: 500, headers: HEADERS }
    );
  }
};
