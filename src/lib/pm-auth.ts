import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sql } from "@vercel/postgres";

const COOKIE_NAME = "pm_session";
const TOKEN_EXPIRY = "8h";

export const VALID_PM_CODES = ["GG", "RG", "MD", "SB"] as const;
export type PmCode = (typeof VALID_PM_CODES)[number];

interface PmJwtPayload {
  sub: string;
  pmCode: string;
  role: string;
  name: string;
  iat: number;
  exp: number;
}

function getPmJwtSecret(): string {
  const secret =
    process.env.ADMIN_JWT_SECRET ?? import.meta.env.ADMIN_JWT_SECRET;
  if (!secret) {
    throw new Error("ADMIN_JWT_SECRET environment variable is not set");
  }
  return secret;
}

export function isValidPmCode(code: string): code is PmCode {
  return VALID_PM_CODES.includes(code.toUpperCase() as PmCode);
}

export function getPmName(code: string): string {
  const names: Record<string, string> = {
    GG: "Graham Goupille",
    RG: "Rich Goupille",
    MD: "Mark Donnal",
    SB: "Scott Brown",
  };
  return names[code.toUpperCase()] ?? code;
}

/**
 * Verify a PM's password against the pm_users table.
 */
export async function verifyPmPassword(
  pmCode: string,
  password: string
): Promise<boolean> {
  if (!isValidPmCode(pmCode)) return false;

  try {
    const result = await sql`
      SELECT password_hash, is_active
      FROM pm_users
      WHERE code = ${pmCode.toUpperCase()}
    `;

    if (result.rows.length === 0) return false;

    const user = result.rows[0];
    if (!user.is_active) return false;
    if (!user.password_hash) return false;

    return bcrypt.compare(password, user.password_hash);
  } catch {
    // Fallback to env var if database is not available
    const envKey = `PM_PASSWORD_HASH_${pmCode.toUpperCase()}`;
    const hash = process.env[envKey] ?? (import.meta.env as Record<string, string>)[envKey];
    if (!hash) return false;
    return bcrypt.compare(password, hash);
  }
}

/**
 * Create a PM session token with code, role, and name in the payload.
 */
export function createPmSessionToken(pmCode: string): string {
  if (!isValidPmCode(pmCode)) {
    throw new Error(`Invalid PM code: ${pmCode}`);
  }
  const secret = getPmJwtSecret();
  const name = getPmName(pmCode);
  const role = pmCode.toUpperCase() === "GG" ? "admin" : "pm";
  return jwt.sign({ sub: "pm", pmCode: pmCode.toUpperCase(), role, name }, secret, {
    expiresIn: TOKEN_EXPIRY,
  });
}

/**
 * Verify a PM session token. Returns the PM code or null if invalid.
 */
export function verifyPmSessionToken(token: string): PmCode | null {
  try {
    const secret = getPmJwtSecret();
    const decoded = jwt.verify(token, secret) as PmJwtPayload;
    if (decoded.sub !== "pm") return null;
    // Support both old (pm field) and new (pmCode field) tokens
    const code = decoded.pmCode ?? (decoded as unknown as Record<string, string>).pm;
    if (!code || !isValidPmCode(code)) return null;
    return code.toUpperCase() as PmCode;
  } catch {
    return null;
  }
}

/**
 * Verify a PM token and return full payload info.
 */
export function getPmFromToken(token: string): { pmCode: PmCode; role: string; name: string } | null {
  try {
    const secret = getPmJwtSecret();
    const decoded = jwt.verify(token, secret) as PmJwtPayload;
    if (decoded.sub !== "pm") return null;
    const code = decoded.pmCode ?? (decoded as unknown as Record<string, string>).pm;
    if (!code || !isValidPmCode(code)) return null;
    return {
      pmCode: code.toUpperCase() as PmCode,
      role: decoded.role ?? (code.toUpperCase() === "GG" ? "admin" : "pm"),
      name: decoded.name ?? getPmName(code),
    };
  } catch {
    return null;
  }
}

export function getPmSessionCookie(
  token: string,
  isProduction: boolean
): string {
  const parts = [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${8 * 60 * 60}`,
  ];
  if (isProduction) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

export function getClearPmSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

export function getPmTokenFromCookies(
  cookieHeader: string | null
): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  const token = match.substring(COOKIE_NAME.length + 1);
  return token || null;
}

export function getPmCodeFromRequest(request: Request): PmCode | null {
  const cookieHeader = request.headers.get("cookie");
  const token = getPmTokenFromCookies(cookieHeader);
  if (!token) return null;
  return verifyPmSessionToken(token);
}

/**
 * Get full PM info from the request's session cookie.
 */
export function getPmFromRequest(request: Request): { pmCode: PmCode; role: string; name: string } | null {
  const cookieHeader = request.headers.get("cookie");
  const token = getPmTokenFromCookies(cookieHeader);
  if (!token) return null;
  return getPmFromToken(token);
}

export function isPmAuthenticated(request: Request): boolean {
  return getPmCodeFromRequest(request) !== null;
}
