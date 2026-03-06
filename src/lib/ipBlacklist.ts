/**
 * IP Blacklist — auto-ban and manual block system.
 *
 * Checks if an IP is blocked, and auto-bans IPs that:
 * 1. Exceed 10 submissions in 24 hours
 * 2. Have a bot score >= 80
 *
 * Blocked IPs silently receive 200 OK — never reveal the block.
 */

import { sql } from "@vercel/postgres";

export interface BlacklistCheckResult {
  blocked: boolean;
  reason?: string;
}

/**
 * Check if an IP is blacklisted. If the IP has auto-ban triggers,
 * add it to the blacklist. Returns whether the IP is blocked.
 */
export async function checkAndEnforceBlacklist(
  ip: string,
  botScore: number
): Promise<BlacklistCheckResult> {
  if (!ip) return { blocked: false };

  try {
    // 1. Check if IP is already blacklisted (active, non-expired)
    const existing = await sql`
      SELECT id, reason FROM ip_blacklist
      WHERE ip_address = ${ip}
      AND (expires_at IS NULL OR expires_at > NOW())
    `;

    if (existing.rows.length > 0) {
      // Increment their attempt counter (non-critical)
      sql`
        UPDATE ip_blacklist
        SET submission_count = submission_count + 1
        WHERE ip_address = ${ip}
      `.catch(() => {
        // Non-critical — don't block the check
      });
      return { blocked: true, reason: existing.rows[0].reason };
    }

    // 2. Check for auto-ban triggers: >10 submissions in 24 hours
    const recentCount = await sql`
      SELECT COUNT(*) as cnt FROM contacts
      WHERE metadata->>'ip' = ${ip}
      AND created_at > NOW() - INTERVAL '24 hours'
    `;

    const count = parseInt(String(recentCount.rows[0]?.cnt || "0"), 10);

    if (count > 10) {
      const meta = JSON.stringify({ submission_count: count, bot_score: botScore });
      await sql`
        INSERT INTO ip_blacklist (ip_address, reason, auto_banned, metadata)
        VALUES (${ip}, ${"Auto-banned: exceeded 10 submissions in 24 hours"}, true, ${meta}::jsonb)
        ON CONFLICT (ip_address) DO UPDATE SET reason = EXCLUDED.reason, blocked_at = NOW()
      `.catch((err: unknown) => {
        console.error("Failed to auto-ban IP (rate):", err instanceof Error ? err.message : "Unknown");
      });
      return { blocked: true, reason: "Rate limit exceeded" };
    }

    // 3. Auto-ban: bot score >= 80
    if (botScore >= 80) {
      const meta = JSON.stringify({ bot_score: botScore });
      await sql`
        INSERT INTO ip_blacklist (ip_address, reason, auto_banned, expires_at, metadata)
        VALUES (${ip}, ${"Auto-banned: high bot score"}, true, NOW() + INTERVAL '7 days', ${meta}::jsonb)
        ON CONFLICT (ip_address) DO UPDATE SET reason = EXCLUDED.reason, blocked_at = NOW(), expires_at = NOW() + INTERVAL '7 days'
      `.catch((err: unknown) => {
        console.error("Failed to auto-ban IP (bot score):", err instanceof Error ? err.message : "Unknown");
      });
      return { blocked: true, reason: "Suspicious activity detected" };
    }

    return { blocked: false };
  } catch (error) {
    // If blacklist check fails entirely, fail open — allow the request
    console.error(
      "Blacklist check failed:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return { blocked: false };
  }
}
