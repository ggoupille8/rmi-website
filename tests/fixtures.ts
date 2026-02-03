/**
 * Test fixtures - Single source of truth for test data
 *
 * These values match the content in src/content/site.ts
 * Keep in sync when updating site content
 */

// Expected site content values (from src/content/site.ts)
export const EXPECTED = {
  companyName: "Resource Mechanical Insulation",
  companyNameFull: "Resource Mechanical Insulation, LLC",
  email: "fab@rmi-llc.net",
  phone: "419-705-6153",
  phoneE164: "+14197056153",
  phoneTel: "tel:+14197056153",
  serviceArea: "Michigan and surrounding areas.",
  address: {
    street: "11677 Wayne Road, Suite 112",
    city: "Romulus",
    state: "MI",
    zip: "48174",
    full: "11677 Wayne Road, Suite 112, Romulus, MI 48174",
  },
  heroHeadline: "Resource Mechanical Insulation",
  heroSubheadline:
    "Serving Michigan and surrounding areas with mechanical insulation for piping, ductwork, equipment, and specialty applications across commercial and industrial environments—focused on professional installs and safety-driven practices.",
  heroCtaPrimary: "Request a Quote",
} as const;

// Valid form data for testing contact form submissions
export const VALID_FORM_DATA = {
  minimal: {
    name: "John Doe",
    email: "john@example.com",
    message: "This is a test message for the contact form.",
  },
  complete: {
    name: "Jane Smith",
    company: "ACME Construction",
    email: "jane@acme.com",
    phone: "555-123-4567",
    projectType: "installation",
    message: "We need insulation for a new commercial building project.",
  },
  withCompany: {
    name: "Bob Builder",
    company: "Builder Corp",
    email: "bob@builder.com",
    message: "Looking for a quote on pipe insulation.",
  },
  phoneOnly: {
    name: "Alice Phone",
    phone: "5551234567",
    message: "Please call me to discuss the project.",
  },
} as const;

// Invalid form data for testing validation
export const INVALID_FORM_DATA = {
  emptyName: {
    name: "",
    email: "test@example.com",
    message: "Test message",
  },
  emptyEmail: {
    name: "Test User",
    email: "",
    message: "Test message",
  },
  emptyMessage: {
    name: "Test User",
    email: "test@example.com",
    message: "",
  },
  invalidEmail: {
    name: "Test User",
    email: "not-an-email",
    message: "Test message",
  },
  invalidEmailNoAt: {
    name: "Test User",
    email: "testexample.com",
    message: "Test message",
  },
  invalidEmailNoDomain: {
    name: "Test User",
    email: "test@",
    message: "Test message",
  },
  tooLongName: {
    name: "A".repeat(101),
    email: "test@example.com",
    message: "Test message",
  },
  tooLongEmail: {
    name: "Test User",
    email: "a".repeat(245) + "@test.com",
    message: "Test message",
  },
  tooLongMessage: {
    name: "Test User",
    email: "test@example.com",
    message: "A".repeat(5001),
  },
  honeypotFilled: {
    name: "Test User",
    email: "test@example.com",
    message: "Test message",
    website: "http://spam.com",
  },
} as const;

// API response fixtures for mocking
export const API_RESPONSES = {
  success: {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ ok: true }),
  },
  serverError: {
    status: 500,
    contentType: "application/json",
    body: JSON.stringify({ ok: false, error: "Server error" }),
  },
  rateLimited: {
    status: 429,
    contentType: "application/json",
    body: JSON.stringify({ ok: false, error: "Too many requests" }),
    headers: { "Retry-After": "60" },
  },
  validationError: {
    status: 400,
    contentType: "application/json",
    body: JSON.stringify({ ok: false, error: "Invalid input" }),
  },
  databaseError: {
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({ ok: false, error: "Database unavailable" }),
  },
  invalidJson: {
    status: 400,
    contentType: "application/json",
    body: JSON.stringify({ ok: false, error: "Invalid JSON" }),
  },
} as const;

// Quote form data for testing quote API
export const VALID_QUOTE_DATA = {
  minimal: {
    name: "John Contractor",
    company: "Contractor LLC",
    email: "john@contractor.com",
    message: "Need a quote for pipe insulation project.",
    serviceType: "installation",
  },
  withPhone: {
    name: "Jane Manager",
    company: "Industrial Corp",
    phone: "555-987-6543",
    message: "Large ductwork insulation project.",
    serviceType: "installation",
  },
  complete: {
    name: "Bob Facility",
    company: "Facility Management Inc",
    email: "bob@facility.com",
    phone: "555-111-2222",
    message: "Multi-building insulation retrofit project.",
    serviceType: "materials",
    timestamp: String(Date.now() - 5000), // 5 seconds ago (passes anti-bot check)
  },
} as const;

// Rate limiting test constants
export const RATE_LIMIT = {
  contact: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
  },
  quote: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    minSubmissionTime: 2000, // 2 seconds
  },
} as const;

// Test IP addresses for rate limiting tests
export const TEST_IPS = {
  client1: "192.168.1.100",
  client2: "192.168.1.101",
  client3: "10.0.0.50",
  localhost: "127.0.0.1",
} as const;

// Field length limits (from API validation)
export const FIELD_LIMITS = {
  maxNameLength: 100,
  maxEmailLength: 254,
  maxMessageLength: 5000,
} as const;
