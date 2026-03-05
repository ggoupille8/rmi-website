import type { APIRoute } from "astro";
import {
  verifyPassword,
  createSessionToken,
  getSessionCookie,
  getClearSessionCookie,
} from "../../../lib/admin-auth";

export const prerender = false;

const SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const password = body?.password;

    if (!password || typeof password !== "string") {
      return new Response(
        JSON.stringify({ error: "Password is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...SECURITY_HEADERS },
        }
      );
    }

    const valid = await verifyPassword(password);
    if (!valid) {
      return new Response(
        JSON.stringify({ error: "Invalid password" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...SECURITY_HEADERS },
        }
      );
    }

    const token = createSessionToken();
    const isProduction = import.meta.env.PROD;
    const cookie = getSessionCookie(token, isProduction);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": cookie,
        ...SECURITY_HEADERS,
      },
    });
  } catch (error) {
    console.error(
      "Admin auth error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...SECURITY_HEADERS },
      }
    );
  }
};

export const DELETE: APIRoute = async () => {
  const cookie = getClearSessionCookie();
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookie,
      ...SECURITY_HEADERS,
    },
  });
};
