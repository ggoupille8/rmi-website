/**
 * Standardized API response helpers.
 *
 * Every error response returns { error: string, code: string }.
 * Success responses are route-specific but always JSON with proper headers.
 */

/** Machine-readable error codes */
export const ErrorCode = {
  BAD_REQUEST: "BAD_REQUEST",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  METHOD_NOT_ALLOWED: "METHOD_NOT_ALLOWED",
  RATE_LIMITED: "RATE_LIMITED",
  PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

const JSON_HEADERS: HeadersInit = { "Content-Type": "application/json" };

/**
 * Build a standardized error Response.
 *
 * @param status  HTTP status code
 * @param error   Human-readable error message
 * @param code    Machine-readable error code from ErrorCode
 * @param extra   Optional extra headers (e.g. Retry-After)
 */
export function apiError(
  status: number,
  error: string,
  code: ErrorCodeValue,
  extraHeaders?: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({ error, code }),
    {
      status,
      headers: { ...JSON_HEADERS, ...extraHeaders },
    },
  );
}

/**
 * Build a JSON success Response.
 */
export function apiSuccess(
  data: unknown,
  status = 200,
  extraHeaders?: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: { ...JSON_HEADERS, ...extraHeaders },
    },
  );
}

/** Max request body size in bytes (50 KB) */
export const MAX_BODY_BYTES = 50 * 1024;
