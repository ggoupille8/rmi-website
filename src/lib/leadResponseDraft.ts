/**
 * AI-powered lead response draft generator.
 *
 * Uses Claude Haiku to draft a personalized response email that Graham
 * reviews before sending. The lead never knows it was AI-drafted.
 */

import Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DraftLeadInput {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  projectType?: string;
  message?: string;
  enrichment?: {
    projectAnalysis?: string;
    companyInfo?: string;
    urgencyLevel?: string;
    aiSummary?: string;
  };
}

export interface ResponseDraft {
  subject: string;
  body: string;
}

// ---------------------------------------------------------------------------
// System prompt — defines the persona and writing rules
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are drafting a brief, professional email response on behalf of Graham Goupille, owner of Resource Mechanical Insulation (RMI), a commercial and industrial mechanical insulation contractor in Romulus, MI.

RMI's capabilities: piping insulation, ductwork insulation, equipment insulation, removable blankets, pipe support fabrication, field-applied jacketing, plan & spec bidding, 24/7 emergency response, material sales.

Key differentiators: Local 25 union-trained workforce, 0.76 EMR safety rating (24% better than average), flagship projects include Henry Ford Hospital, Michigan Central Station, Ford World HQ.

Rules:
- Keep it to 3-5 sentences max
- Reference their specific project if they mentioned one
- Suggest a concrete next step (call, site visit, or "send over your specs")
- Be warm and direct, not salesy
- Never mention AI, automation, or that this was generated
- Sign off as: Graham Goupille | Resource Mechanical Insulation
- Phone: 248-379-5156 | Email: ggoupille@rmi-llc.net`;

// ---------------------------------------------------------------------------
// Draft generator
// ---------------------------------------------------------------------------

export async function generateResponseDraft(
  lead: DraftLeadInput
): Promise<ResponseDraft> {
  const apiKey = import.meta.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("ANTHROPIC_API_KEY not set — skipping draft generation");
    return {
      subject: "Re: Your insulation project inquiry",
      body: "(Draft generation skipped — API key not configured)",
    };
  }

  const client = new Anthropic({ apiKey });

  const userPrompt = `Draft a response email to this lead:
Name: ${lead.name}
Company: ${lead.company || "Not provided"}
Project Type: ${lead.projectType || "Not specified"}
Message: ${lead.message || "No message"}
${lead.enrichment?.aiSummary ? `AI Analysis: ${lead.enrichment.aiSummary}` : ""}
${lead.enrichment?.urgencyLevel ? `Urgency: ${lead.enrichment.urgencyLevel}` : ""}

Return ONLY a JSON object with "subject" and "body" fields. No markdown, no backticks.`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);

    let response: Anthropic.Messages.Message;
    try {
      response = await client.messages.create(
        {
          model: "claude-haiku-4-5-20251001",
          max_tokens: 500,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }],
        },
        { signal: controller.signal }
      );
    } finally {
      clearTimeout(timeout);
    }

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed: { subject: string; body: string } = JSON.parse(cleaned);
    return { subject: parsed.subject, body: parsed.body };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    const isTimeout = msg.includes("abort");
    console.error(
      `Draft generation ${isTimeout ? "timed out" : "failed"}:`,
      msg
    );
    return {
      subject: "Re: Your insulation project inquiry",
      body: `(Draft generation ${isTimeout ? "timed out" : "failed"} — please reply manually)`,
    };
  }
}
