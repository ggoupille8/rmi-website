// src/pages/api/contact.ts
export const prerender = false;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isEmailLike(v: string): boolean {
  // pragmatic validation; avoids dependencies
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export async function POST({ request }: { request: Request }) {
  let data: unknown;

  try {
    data = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const obj = (typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {}) as Record<
    string,
    unknown
  >;

  const name = typeof obj.name === "string" ? obj.name.trim() : "";
  const email = typeof obj.email === "string" ? obj.email.trim() : "";
  const message = typeof obj.message === "string" ? obj.message.trim() : "";

  if (!isNonEmptyString(name) || !isNonEmptyString(message) || !isEmailLike(email)) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid input" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Phase 1: accept request. Wire email delivery later (provider + env vars).
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// Ensure non-POST methods get a clear response
export async function ALL() {
  return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
}
