import { describe, it, expect } from "vitest";
import {
  isNonEmptyString,
  isValidEmail,
  isValidPhone,
  sanitizeString,
  validateContactForm,
  validateQuoteForm,
  escapeHtml,
  FIELD_LIMITS,
  MIN_SUBMISSION_TIME_MS,
} from "../validation";

describe("validation utilities", () => {
  describe("isNonEmptyString", () => {
    it("returns true for non-empty strings", () => {
      expect(isNonEmptyString("hello")).toBe(true);
      expect(isNonEmptyString("  hello  ")).toBe(true);
      expect(isNonEmptyString("a")).toBe(true);
    });

    it("returns false for empty strings", () => {
      expect(isNonEmptyString("")).toBe(false);
      expect(isNonEmptyString("   ")).toBe(false);
      expect(isNonEmptyString("\t\n")).toBe(false);
    });

    it("returns false for non-string values", () => {
      expect(isNonEmptyString(null)).toBe(false);
      expect(isNonEmptyString(undefined)).toBe(false);
      expect(isNonEmptyString(123)).toBe(false);
      expect(isNonEmptyString({})).toBe(false);
      expect(isNonEmptyString([])).toBe(false);
    });
  });

  describe("isValidEmail", () => {
    it("accepts valid email formats", () => {
      expect(isValidEmail("test@example.com")).toBe(true);
      expect(isValidEmail("user.name@domain.org")).toBe(true);
      expect(isValidEmail("user+tag@example.co.uk")).toBe(true);
      expect(isValidEmail("name123@test.io")).toBe(true);
      expect(isValidEmail("  test@example.com  ")).toBe(true); // Trims whitespace
    });

    it("rejects invalid email formats", () => {
      expect(isValidEmail("")).toBe(false);
      expect(isValidEmail("notanemail")).toBe(false);
      expect(isValidEmail("missing@domain")).toBe(false);
      expect(isValidEmail("@nodomain.com")).toBe(false);
      expect(isValidEmail("noat.com")).toBe(false);
      expect(isValidEmail("spaces in@email.com")).toBe(false);
      expect(isValidEmail("test@")).toBe(false);
    });

    it("handles edge cases", () => {
      expect(isValidEmail(null as unknown as string)).toBe(false);
      expect(isValidEmail(undefined as unknown as string)).toBe(false);
      expect(isValidEmail(123 as unknown as string)).toBe(false);
    });
  });

  describe("isValidPhone", () => {
    it("accepts valid US phone formats", () => {
      // 10 digit formats
      expect(isValidPhone("5551234567")).toBe(true);
      expect(isValidPhone("555-123-4567")).toBe(true);
      expect(isValidPhone("(555) 123-4567")).toBe(true);
      expect(isValidPhone("555.123.4567")).toBe(true);
      expect(isValidPhone("555 123 4567")).toBe(true);

      // 11 digit formats starting with 1
      expect(isValidPhone("15551234567")).toBe(true);
      expect(isValidPhone("1-555-123-4567")).toBe(true);
      expect(isValidPhone("+1 555 123 4567")).toBe(true);
    });

    it("rejects invalid phone formats", () => {
      expect(isValidPhone("")).toBe(false);
      expect(isValidPhone("123")).toBe(false);
      expect(isValidPhone("123456789")).toBe(false); // 9 digits
      expect(isValidPhone("12345678901234")).toBe(false); // too long
      expect(isValidPhone("25551234567")).toBe(false); // 11 digits not starting with 1
      expect(isValidPhone("abcdefghij")).toBe(false); // letters
    });

    it("handles edge cases", () => {
      expect(isValidPhone(null as unknown as string)).toBe(false);
      expect(isValidPhone(undefined as unknown as string)).toBe(false);
      expect(isValidPhone("   ")).toBe(false);
    });
  });

  describe("sanitizeString", () => {
    it("trims whitespace from strings", () => {
      expect(sanitizeString("  hello  ")).toBe("hello");
      expect(sanitizeString("\ttest\n")).toBe("test");
    });

    it("returns empty string for non-string values", () => {
      expect(sanitizeString(null)).toBe("");
      expect(sanitizeString(undefined)).toBe("");
      expect(sanitizeString(123)).toBe("");
      expect(sanitizeString({})).toBe("");
    });
  });

  describe("escapeHtml", () => {
    it("escapes HTML special characters", () => {
      expect(escapeHtml("<script>alert('xss')</script>")).toBe(
        "&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;"
      );
      expect(escapeHtml('Hello "World" & <Friends>')).toBe(
        "Hello &quot;World&quot; &amp; &lt;Friends&gt;"
      );
    });

    it("leaves safe text unchanged", () => {
      expect(escapeHtml("Hello World")).toBe("Hello World");
      expect(escapeHtml("test@example.com")).toBe("test@example.com");
    });
  });

  describe("validateContactForm", () => {
    const validData = {
      name: "John Doe",
      email: "john@example.com",
      message: "This is a test message.",
    };

    it("validates correct contact form data", () => {
      const result = validateContactForm(validData);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it("rejects missing name", () => {
      const result = validateContactForm({
        ...validData,
        name: "",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.name).toBeDefined();
    });

    it("rejects missing email", () => {
      const result = validateContactForm({
        ...validData,
        email: "",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.email).toBeDefined();
    });

    it("rejects invalid email format", () => {
      const result = validateContactForm({
        ...validData,
        email: "not-an-email",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.email).toContain("Invalid email");
    });

    it("rejects missing message", () => {
      const result = validateContactForm({
        ...validData,
        message: "",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.message).toBeDefined();
    });

    it("rejects name exceeding max length", () => {
      const result = validateContactForm({
        ...validData,
        name: "A".repeat(FIELD_LIMITS.MAX_NAME_LENGTH + 1),
      });
      expect(result.valid).toBe(false);
      expect(result.errors.name).toContain("characters or less");
    });

    it("rejects email exceeding max length", () => {
      // MAX_EMAIL_LENGTH is 254, so 246 'a' chars + '@test.com' (9 chars) = 255 total
      const result = validateContactForm({
        ...validData,
        email: "a".repeat(246) + "@test.com",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.email).toContain("characters or less");
    });

    it("rejects message exceeding max length", () => {
      const result = validateContactForm({
        ...validData,
        message: "A".repeat(FIELD_LIMITS.MAX_MESSAGE_LENGTH + 1),
      });
      expect(result.valid).toBe(false);
      expect(result.errors.message).toContain("characters or less");
    });

    it("silently accepts honeypot submissions", () => {
      const result = validateContactForm({
        ...validData,
        website: "http://spam.com",
      });
      // Honeypot triggers silent success (spam filtering)
      expect(result.valid).toBe(true);
    });

    it("handles null/undefined input", () => {
      expect(validateContactForm(null).valid).toBe(false);
      expect(validateContactForm(undefined).valid).toBe(false);
      expect(validateContactForm("string").valid).toBe(false);
    });

    it("collects multiple validation errors", () => {
      const result = validateContactForm({
        name: "",
        email: "invalid",
        message: "",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.name).toBeDefined();
      expect(result.errors.email).toBeDefined();
      expect(result.errors.message).toBeDefined();
    });
  });

  describe("validateQuoteForm", () => {
    const validQuote = {
      name: "Jane Smith",
      company: "ACME Corp",
      email: "jane@acme.com",
      message: "Need a quote for pipe insulation.",
      serviceType: "installation",
    };

    it("validates correct quote form data", () => {
      const result = validateQuoteForm(validQuote);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it("accepts phone instead of email", () => {
      const result = validateQuoteForm({
        ...validQuote,
        email: undefined,
        phone: "555-123-4567",
      });
      expect(result.valid).toBe(true);
    });

    it("accepts both email and phone", () => {
      const result = validateQuoteForm({
        ...validQuote,
        phone: "555-123-4567",
      });
      expect(result.valid).toBe(true);
    });

    it("rejects missing both email and phone", () => {
      const result = validateQuoteForm({
        ...validQuote,
        email: undefined,
        phone: undefined,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.email).toBeDefined();
      expect(result.errors.phone).toBeDefined();
    });

    it("rejects missing company", () => {
      const result = validateQuoteForm({
        ...validQuote,
        company: "",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.company).toBeDefined();
    });

    it("rejects missing serviceType", () => {
      const result = validateQuoteForm({
        ...validQuote,
        serviceType: "",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.serviceType).toBeDefined();
    });

    it("detects honeypot submissions as spam", () => {
      const result = validateQuoteForm({
        ...validQuote,
        honeypot: "spam content",
      });
      expect(result.valid).toBe(false);
      expect(result.isSpam).toBe(true);
    });

    it("validates timestamp for anti-bot check", () => {
      // Timestamp from now (too fast)
      const fastResult = validateQuoteForm({
        ...validQuote,
        timestamp: String(Date.now()),
      });
      expect(fastResult.valid).toBe(false);
      expect(fastResult.errors.timestamp).toContain("too fast");

      // Timestamp from 5 seconds ago (acceptable)
      const okResult = validateQuoteForm({
        ...validQuote,
        timestamp: String(Date.now() - MIN_SUBMISSION_TIME_MS - 1000),
      });
      expect(okResult.valid).toBe(true);
    });

    it("handles invalid timestamp format", () => {
      const result = validateQuoteForm({
        ...validQuote,
        timestamp: "not-a-number",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.timestamp).toContain("Invalid timestamp");
    });

    it("validates invalid email format when provided", () => {
      const result = validateQuoteForm({
        ...validQuote,
        email: "not-valid-email",
        phone: undefined,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.email).toContain("Invalid email");
    });

    it("validates invalid phone format when provided", () => {
      const result = validateQuoteForm({
        ...validQuote,
        email: undefined,
        phone: "123",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.phone).toContain("Invalid phone");
    });
  });
});
