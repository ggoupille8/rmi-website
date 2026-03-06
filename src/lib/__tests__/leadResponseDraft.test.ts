import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate };
  },
}));

import { generateResponseDraft } from "../leadResponseDraft";
import type { DraftLeadInput } from "../leadResponseDraft";

const sampleLead: DraftLeadInput = {
  name: "John Smith",
  email: "john@example.com",
  phone: "555-0123",
  company: "Acme Corp",
  projectType: "Pipe Insulation",
  message: "Need insulation for our new facility",
};

describe("generateResponseDraft", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  // --- No API key ---

  it("returns fallback when ANTHROPIC_API_KEY is not set", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");

    const result = await generateResponseDraft(sampleLead);
    expect(result.subject).toBe("Re: Your insulation project inquiry");
    expect(result.body).toContain("skipped");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns fallback when ANTHROPIC_API_KEY is undefined", async () => {
    // Ensure the key is removed
    delete (import.meta.env as Record<string, string>).ANTHROPIC_API_KEY;

    const result = await generateResponseDraft(sampleLead);
    expect(result.subject).toBe("Re: Your insulation project inquiry");
    expect(result.body).toContain("skipped");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  // --- Successful generation ---

  it("generates a draft from a successful API response", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key-123");

    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            subject: "Re: Pipe Insulation Project at Acme Corp",
            body: "Hi John, thanks for reaching out about your pipe insulation needs.",
          }),
        },
      ],
    });

    const result = await generateResponseDraft(sampleLead);
    expect(result.subject).toBe("Re: Pipe Insulation Project at Acme Corp");
    expect(result.body).toContain("Hi John");
  });

  it("strips markdown backticks from API response", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key-123");

    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: '```json\n{"subject": "Re: Your project", "body": "Hello there"}\n```',
        },
      ],
    });

    const result = await generateResponseDraft(sampleLead);
    expect(result.subject).toBe("Re: Your project");
    expect(result.body).toBe("Hello there");
  });

  // --- Error handling ---

  it("returns fallback on API error", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key-123");
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockCreate.mockRejectedValueOnce(new Error("API rate limit exceeded"));

    const result = await generateResponseDraft(sampleLead);
    expect(result.subject).toBe("Re: Your insulation project inquiry");
    expect(result.body).toContain("failed");
  });

  it("returns fallback on malformed JSON response", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key-123");
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "This is not valid JSON at all" }],
    });

    const result = await generateResponseDraft(sampleLead);
    expect(result.subject).toBe("Re: Your insulation project inquiry");
    expect(result.body).toContain("failed");
  });

  it("logs error on API failure", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key-123");
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    mockCreate.mockRejectedValueOnce(new Error("Network timeout"));

    await generateResponseDraft(sampleLead);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Draft generation failed:",
      "Network timeout"
    );
  });

  // --- API call validation ---

  it("calls Claude with the correct model and parameters", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key-123");

    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: '{"subject": "Re: test", "body": "test body"}',
        },
      ],
    });

    await generateResponseDraft(sampleLead);

    expect(mockCreate).toHaveBeenCalledOnce();
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.model).toBe("claude-haiku-4-5-20251001");
    expect(callArgs.max_tokens).toBe(500);
    expect(callArgs.system).toContain("Graham Goupille");
    expect(callArgs.system).toContain("Resource Mechanical Insulation");
  });

  it("includes lead details in the prompt", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key-123");

    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: '{"subject": "Re: test", "body": "test"}',
        },
      ],
    });

    await generateResponseDraft(sampleLead);

    const prompt = mockCreate.mock.calls[0][0].messages[0].content;
    expect(prompt).toContain("John Smith");
    expect(prompt).toContain("Acme Corp");
    expect(prompt).toContain("Pipe Insulation");
    expect(prompt).toContain("Need insulation for our new facility");
  });

  it("includes enrichment data in the prompt when available", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key-123");

    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: '{"subject": "Re: test", "body": "test"}',
        },
      ],
    });

    const leadWithEnrichment: DraftLeadInput = {
      ...sampleLead,
      enrichment: {
        aiSummary: "Large commercial project needing 500ft of pipe insulation",
        urgencyLevel: "high",
      },
    };

    await generateResponseDraft(leadWithEnrichment);

    const prompt = mockCreate.mock.calls[0][0].messages[0].content;
    expect(prompt).toContain("Large commercial project");
    expect(prompt).toContain("high");
  });

  it("uses fallback text for missing optional lead fields", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key-123");

    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: '{"subject": "Re: Inquiry", "body": "Thanks for reaching out"}',
        },
      ],
    });

    const minimalLead: DraftLeadInput = {
      name: "Jane",
      email: "jane@test.com",
    };

    await generateResponseDraft(minimalLead);

    const prompt = mockCreate.mock.calls[0][0].messages[0].content;
    expect(prompt).toContain("Not provided"); // company fallback
    expect(prompt).toContain("Not specified"); // projectType fallback
    expect(prompt).toContain("No message"); // message fallback
  });

  it("does not include enrichment lines when enrichment is absent", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key-123");

    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: '{"subject": "Re: test", "body": "body"}',
        },
      ],
    });

    const leadNoEnrichment: DraftLeadInput = {
      name: "Bob",
      email: "bob@test.com",
    };

    await generateResponseDraft(leadNoEnrichment);

    const prompt = mockCreate.mock.calls[0][0].messages[0].content;
    expect(prompt).not.toContain("AI Analysis:");
    expect(prompt).not.toContain("Urgency:");
  });
});
