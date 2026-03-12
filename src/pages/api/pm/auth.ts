import type { APIRoute } from "astro";
import {
  verifyPmPassword,
  createPmSessionToken,
  getPmSessionCookie,
  getClearPmSessionCookie,
  isValidPmCode,
  getPmFromRequest,
} from "../../../lib/pm-auth";

export const prerender = false;

const SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

/** GET /api/pm/auth — Return current PM session info or 401. */
export const GET: APIRoute = async ({ request }) => {
  const pm = getPmFromRequest(request);
  if (!pm) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...SECURITY_HEADERS },
    });
  }

  return new Response(
    JSON.stringify({
      pmCode: pm.pmCode,
      name: pm.name,
      role: pm.role,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json", ...SECURITY_HEADERS },
    }
  );
};

/** POST /api/pm/auth — Login with PM code and password. */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const pmCode = body?.pmCode;
    const password = body?.password;

    if (!pmCode || typeof pmCode !== "string" || !isValidPmCode(pmCode)) {
      return new Response(
        JSON.stringify({ error: "Valid PM code is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...SECURITY_HEADERS },
        }
      );
    }

    if (!password || typeof password !== "string") {
      return new Response(
        JSON.stringify({ error: "Password is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...SECURITY_HEADERS },
        }
      );
    }

    const valid = await verifyPmPassword(pmCode, password);
    if (!valid) {
      return new Response(
        JSON.stringify({ error: "Invalid credentials" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...SECURITY_HEADERS },
        }
      );
    }

    const token = createPmSessionToken(pmCode);
    const isProduction = import.meta.env.PROD;
    const cookie = getPmSessionCookie(token, isProduction);

    return new Response(JSON.stringify({ ok: true, pmCode }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": cookie,
        ...SECURITY_HEADERS,
      },
    });
  } catch (error) {
    console.error(
      "PM auth error:",
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

/** DELETE /api/pm/auth — Logout (clear session cookie). */
export const DELETE: APIRoute = async () => {
  const cookie = getClearPmSessionCookie();
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookie,
      ...SECURITY_HEADERS,
    },
  });
};
