import type { Page } from "@playwright/test";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const COOKIE_NAME = "rmi_admin_session";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Read the admin JWT secret from .env.local or process.env.
 * Returns null if not available (tests should skip).
 */
function getJwtSecret(): string | null {
  if (process.env.ADMIN_JWT_SECRET) {
    return process.env.ADMIN_JWT_SECRET;
  }

  const envPath = path.join(__dirname, "..", "..", ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    const match = content.match(/^ADMIN_JWT_SECRET=["']?([^"'\r\n]+)["']?$/m);
    if (match) return match[1].trim();
  }

  return null;
}

/**
 * Create a valid admin JWT session token.
 * Returns null if ADMIN_JWT_SECRET is not available.
 */
export function createAdminToken(): string | null {
  const secret = getJwtSecret();
  if (!secret) return null;
  return jwt.sign({ sub: "admin" }, secret, { expiresIn: "8h" });
}

/**
 * Set a valid admin session cookie on the browser context.
 * Must be called BEFORE navigating to admin pages.
 * Returns false if auth is not available (caller should skip test).
 */
export async function setAdminAuth(page: Page): Promise<boolean> {
  const token = createAdminToken();
  if (!token) return false;

  await page.context().addCookies([
    {
      name: COOKIE_NAME,
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);

  return true;
}
