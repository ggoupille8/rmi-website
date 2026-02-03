/**
 * Validation utilities for form inputs
 *
 * Extracted from API endpoints for testability
 */

// Field length limits
export const FIELD_LIMITS = {
  MAX_NAME_LENGTH: 100,
  MAX_EMAIL_LENGTH: 254,
  MAX_MESSAGE_LENGTH: 5000,
  MAX_COMPANY_LENGTH: 200,
  MAX_PHONE_LENGTH: 20,
  MAX_SERVICE_TYPE_LENGTH: 100,
} as const;

/**
 * Check if a value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Validate email format using pragmatic regex
 * Covers most common email formats without being overly strict
 */
export function isValidEmail(value: string): boolean {
  if (!value || typeof value !== "string") {
    return false;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return false;
  }
  // Pragmatic email validation regex
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

/**
 * Validate US phone number format
 * Accepts 10 digits or 11 digits starting with 1
 */
export function isValidPhone(value: string): boolean {
  if (!value || typeof value !== "string") {
    return false;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return false;
  }
  // Remove all non-digit characters for validation
  const digitsOnly = trimmed.replace(/\D/g, "");
  // Valid US phone: 10 digits, or 11 digits starting with 1
  return (
    digitsOnly.length === 10 ||
    (digitsOnly.length === 11 && digitsOnly[0] === "1")
  );
}

/**
 * Sanitize and trim a string value
 */
export function sanitizeString(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

/**
 * Contact form field validation result
 */
export interface ContactValidationResult {
  valid: boolean;
  errors: {
    name?: string;
    email?: string;
    message?: string;
    general?: string;
  };
}

/**
 * Contact form data structure
 */
export interface ContactFormData {
  name: unknown;
  email: unknown;
  message: unknown;
  website?: unknown; // Honeypot field
  source?: unknown;
  timestamp?: unknown;
  metadata?: {
    elapsedMs?: unknown;
    fastSubmit?: unknown;
  };
}

/**
 * Validate contact form data
 */
export function validateContactForm(data: unknown): ContactValidationResult {
  if (!data || typeof data !== "object") {
    return {
      valid: false,
      errors: { general: "Invalid request body" },
    };
  }

  const formData = data as ContactFormData;
  const errors: ContactValidationResult["errors"] = {};

  // Extract and sanitize fields
  const name = sanitizeString(formData.name);
  const email = sanitizeString(formData.email);
  const message = sanitizeString(formData.message);
  const website = sanitizeString(formData.website);

  // Honeypot check - silently accept but flag as spam
  if (website.length > 0) {
    return { valid: true, errors: {} }; // Silent success for spam
  }

  // Required field: name
  if (!isNonEmptyString(name)) {
    errors.name = "Name is required";
  } else if (name.length > FIELD_LIMITS.MAX_NAME_LENGTH) {
    errors.name = `Name must be ${FIELD_LIMITS.MAX_NAME_LENGTH} characters or less`;
  }

  // Required field: email with format validation
  if (!isNonEmptyString(email)) {
    errors.email = "Email is required";
  } else if (email.length > FIELD_LIMITS.MAX_EMAIL_LENGTH) {
    errors.email = `Email must be ${FIELD_LIMITS.MAX_EMAIL_LENGTH} characters or less`;
  } else if (!isValidEmail(email)) {
    errors.email = "Invalid email format";
  }

  // Required field: message
  if (!isNonEmptyString(message)) {
    errors.message = "Message is required";
  } else if (message.length > FIELD_LIMITS.MAX_MESSAGE_LENGTH) {
    errors.message = `Message must be ${FIELD_LIMITS.MAX_MESSAGE_LENGTH} characters or less`;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Quote form data structure
 */
export interface QuoteFormData {
  name: unknown;
  company: unknown;
  email?: unknown;
  phone?: unknown;
  message: unknown;
  serviceType: unknown;
  honeypot?: unknown;
  timestamp?: unknown;
}

/**
 * Quote form validation result
 */
export interface QuoteValidationResult {
  valid: boolean;
  errors: {
    name?: string;
    company?: string;
    email?: string;
    phone?: string;
    message?: string;
    serviceType?: string;
    timestamp?: string;
    general?: string;
  };
  isSpam?: boolean;
}

// Minimum time between page load and submission (anti-bot)
export const MIN_SUBMISSION_TIME_MS = 2000;

/**
 * Validate quote form data
 */
export function validateQuoteForm(data: unknown): QuoteValidationResult {
  if (!data || typeof data !== "object") {
    return {
      valid: false,
      errors: { general: "Invalid request body" },
    };
  }

  const formData = data as QuoteFormData;
  const errors: QuoteValidationResult["errors"] = {};

  // Extract and sanitize fields
  const name = sanitizeString(formData.name);
  const company = sanitizeString(formData.company);
  const email = sanitizeString(formData.email);
  const phone = sanitizeString(formData.phone);
  const message = sanitizeString(formData.message);
  const serviceType = sanitizeString(formData.serviceType);
  const honeypot = sanitizeString(formData.honeypot);

  // Honeypot check
  if (honeypot.length > 0) {
    return { valid: false, errors: { general: "Spam detected" }, isSpam: true };
  }

  // Required: name
  if (!isNonEmptyString(name)) {
    errors.name = "Name is required";
  } else if (name.length > FIELD_LIMITS.MAX_NAME_LENGTH) {
    errors.name = `Name must be ${FIELD_LIMITS.MAX_NAME_LENGTH} characters or less`;
  }

  // Required: company
  if (!isNonEmptyString(company)) {
    errors.company = "Company is required";
  } else if (company.length > FIELD_LIMITS.MAX_COMPANY_LENGTH) {
    errors.company = `Company must be ${FIELD_LIMITS.MAX_COMPANY_LENGTH} characters or less`;
  }

  // Email or phone required (at least one)
  const hasValidEmail = isNonEmptyString(email) && isValidEmail(email);
  const hasValidPhone = isNonEmptyString(phone) && isValidPhone(phone);

  if (!hasValidEmail && !hasValidPhone) {
    if (!isNonEmptyString(email) && !isNonEmptyString(phone)) {
      errors.email = "Email or phone is required";
      errors.phone = "Email or phone is required";
    } else if (isNonEmptyString(email) && !isValidEmail(email)) {
      errors.email = "Invalid email format";
    } else if (isNonEmptyString(phone) && !isValidPhone(phone)) {
      errors.phone = "Invalid phone format";
    }
  }

  // Validate email length if provided
  if (email.length > FIELD_LIMITS.MAX_EMAIL_LENGTH) {
    errors.email = `Email must be ${FIELD_LIMITS.MAX_EMAIL_LENGTH} characters or less`;
  }

  // Validate phone length if provided
  if (phone.length > FIELD_LIMITS.MAX_PHONE_LENGTH) {
    errors.phone = `Phone must be ${FIELD_LIMITS.MAX_PHONE_LENGTH} characters or less`;
  }

  // Required: message
  if (!isNonEmptyString(message)) {
    errors.message = "Message is required";
  } else if (message.length > FIELD_LIMITS.MAX_MESSAGE_LENGTH) {
    errors.message = `Message must be ${FIELD_LIMITS.MAX_MESSAGE_LENGTH} characters or less`;
  }

  // Required: serviceType
  if (!isNonEmptyString(serviceType)) {
    errors.serviceType = "Service type is required";
  } else if (serviceType.length > FIELD_LIMITS.MAX_SERVICE_TYPE_LENGTH) {
    errors.serviceType = `Service type must be ${FIELD_LIMITS.MAX_SERVICE_TYPE_LENGTH} characters or less`;
  }

  // Timestamp validation (anti-bot timing check)
  if (formData.timestamp !== undefined) {
    const timestamp =
      typeof formData.timestamp === "string"
        ? parseInt(formData.timestamp, 10)
        : typeof formData.timestamp === "number"
          ? formData.timestamp
          : NaN;

    if (isNaN(timestamp)) {
      errors.timestamp = "Invalid timestamp";
    } else {
      const elapsed = Date.now() - timestamp;
      if (elapsed < MIN_SUBMISSION_TIME_MS) {
        errors.timestamp = "Submission too fast";
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char]);
}
