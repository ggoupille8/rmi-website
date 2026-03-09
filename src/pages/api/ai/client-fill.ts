import type { APIRoute } from "astro";
import { isAdminAuthorized } from "../../../lib/admin-auth";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!isAdminAuthorized(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { name } = body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return new Response(JSON.stringify({ error: "name required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = import.meta.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: `You help populate a client showcase for Resource Mechanical Insulation (RMI), a commercial/industrial mechanical insulation contractor in SE Michigan.

Client: "${name.trim()}"

Return ONLY raw JSON, no markdown:
{
  "name": "Full official company name",
  "domain": "primary domain e.g. ford.com",
  "color": "accurate brand hex color",
  "description": "What RMI likely does for them — 6 words max",
  "seo_value": integer 1-100 for national brand recognition
}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error("Anthropic API error:", res.status, res.statusText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = (await res.json()) as {
      content?: Array<{ text?: string }>;
    };
    const text = data.content?.[0]?.text ?? "{}";

    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed: unknown = JSON.parse(cleaned);

    return new Response(JSON.stringify(parsed), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI fill error:", error instanceof Error ? error.message : "Unknown error");
    return new Response(JSON.stringify({ error: "AI parse failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
