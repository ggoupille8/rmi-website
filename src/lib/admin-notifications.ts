import { sql } from "@vercel/postgres";
import { getPostgresEnv } from "./db-env";

export interface AdminNotification {
  id: string;
  type: "new_lead" | "lead_forwarded" | "system_error" | "system_info";
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

/**
 * Ensure the notifications table exists.
 * Called lazily on first API hit.
 */
export async function ensureNotificationsTable(): Promise<void> {
  const { url } = getPostgresEnv();
  if (!url) return;

  await sql`
    CREATE TABLE IF NOT EXISTS admin_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type TEXT NOT NULL DEFAULT 'system_info',
      title TEXT NOT NULL,
      message TEXT NOT NULL DEFAULT '',
      metadata JSONB DEFAULT '{}',
      read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_notifications_unread
    ON admin_notifications (read, created_at DESC)
    WHERE read = FALSE
  `;
}

/**
 * Create a notification.
 */
export async function createNotification(
  type: AdminNotification["type"],
  title: string,
  message: string = "",
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const { url } = getPostgresEnv();
  if (!url) return;

  try {
    await ensureNotificationsTable();
    await sql`
      INSERT INTO admin_notifications (type, title, message, metadata)
      VALUES (${type}, ${title}, ${message}, ${JSON.stringify(metadata)})
    `;
  } catch (error) {
    console.error("Failed to create notification:", error instanceof Error ? error.message : "Unknown");
  }
}

/**
 * Get recent notifications.
 */
export async function getNotifications(limit = 20, unreadOnly = false): Promise<AdminNotification[]> {
  const { url } = getPostgresEnv();
  if (!url) return [];

  try {
    await ensureNotificationsTable();

    const result = unreadOnly
      ? await sql`SELECT * FROM admin_notifications WHERE read = FALSE ORDER BY created_at DESC LIMIT ${limit}`
      : await sql`SELECT * FROM admin_notifications ORDER BY created_at DESC LIMIT ${limit}`;

    return result.rows as AdminNotification[];
  } catch (error) {
    console.error("Failed to get notifications:", error instanceof Error ? error.message : "Unknown");
    return [];
  }
}

/**
 * Get unread count.
 */
export async function getUnreadCount(): Promise<number> {
  const { url } = getPostgresEnv();
  if (!url) return 0;

  try {
    await ensureNotificationsTable();
    const result = await sql`SELECT COUNT(*) as count FROM admin_notifications WHERE read = FALSE`;
    return parseInt(result.rows[0]?.count || "0", 10);
  } catch {
    return 0;
  }
}

/**
 * Mark notifications as read.
 */
export async function markAsRead(ids?: string[]): Promise<void> {
  const { url } = getPostgresEnv();
  if (!url) return;

  try {
    if (ids && ids.length > 0) {
      for (const id of ids) {
        await sql`UPDATE admin_notifications SET read = TRUE WHERE id = ${id}`;
      }
    } else {
      await sql`UPDATE admin_notifications SET read = TRUE WHERE read = FALSE`;
    }
  } catch (error) {
    console.error("Failed to mark as read:", error instanceof Error ? error.message : "Unknown");
  }
}
