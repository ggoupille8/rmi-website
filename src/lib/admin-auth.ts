import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const COOKIE_NAME = "rmi_admin_session";
const TOKEN_EXPIRY = "8h";

interface JwtPayload {
  sub: string;
  iat: number;
  exp: number;
}

function getJwtSecret(): string {
  const secret =
    process.env.ADMIN_JWT_SECRET ?? import.meta.env.ADMIN_JWT_SECRET;
  if (!secret) {
    throw new Error("ADMIN_JWT_SECRET environment variable is not set");
  }
  return secret;
}

function getPasswordHash(): string {
  const hash =
    process.env.ADMIN_PASSWORD_HASH ?? import.meta.env.ADMIN_PASSWORD_HASH;
  if (!hash) {
    throw new Error("ADMIN_PASSWORD_HASH environment variable is not set");
  }
  return hash;
}

export async function verifyPassword(password: string): Promise<boolean> {
  const hash = getPasswordHash();
  return bcrypt.compare(password, hash);
}

export function createSessionToken(): string {
  const secret = getJwtSecret();
  return jwt.sign({ sub: "admin" }, secret, {
    expiresIn: TOKEN_EXPIRY,
  });
}

export function verifySessionToken(token: string): boolean {
  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret) as JwtPayload;
    return decoded.sub === "admin";
  } catch {
    return false;
  }
}

export function getSessionCookie(token: string, isProduction: boolean): string {
  const parts = [
    `${COOKIE_NAME}=${token}`,
    "Path=/admin",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${8 * 60 * 60}`,
  ];
  if (isProduction) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

export function getClearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=0`;
}

export function getTokenFromCookies(
  cookieHeader: string | null
): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  return match.substring(COOKIE_NAME.length + 1);
}

export function isAuthenticated(request: Request): boolean {
  const cookieHeader = request.headers.get("cookie");
  const token = getTokenFromCookies(cookieHeader);
  if (!token) return false;
  return verifySessionToken(token);
}

/** Check admin API key from Authorization header (backward compat) */
export function isApiKeyAuthorized(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;

  const adminKey = import.meta.env.ADMIN_API_KEY ?? process.env.ADMIN_API_KEY;
  if (!adminKey) return false;

  if (!/^Bearer [^\s]+$/.test(authHeader)) return false;

  const token = authHeader.substring(7);
  const tokenBuffer = Buffer.from(token);
  const adminBuffer = Buffer.from(adminKey);
  if (tokenBuffer.length !== adminBuffer.length) return false;

  return crypto.timingSafeEqual(tokenBuffer, adminBuffer);
}

/** Check if request is authorized via session cookie OR API key */
export function isAdminAuthorized(request: Request): boolean {
  return isAuthenticated(request) || isApiKeyAuthorized(request);
}
