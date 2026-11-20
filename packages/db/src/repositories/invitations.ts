import { and, eq, gt, sql } from "drizzle-orm";
import type { Db } from "../client.ts";
import { invitation } from "../schema/index.ts";

/**
 * Invitations are created and accepted by the auth library; this is the one
 * question the rest of the platform asks about them.
 */
export const invitations = {
  /** Whether this address holds an invitation that can still be accepted. */
  async hasPendingFor(db: Db, email: string): Promise<boolean> {
    const pending = await db
      .select({ id: invitation.id })
      .from(invitation)
      .where(
        and(
          eq(sql`lower(${invitation.email})`, email.trim().toLowerCase()),
          eq(invitation.status, "pending"),
          // Compared with a value from this process, the way the auth library writes the column.
          gt(invitation.expiresAt, new Date()),
        ),
      )
      .limit(1);
    return pending.length > 0;
  },
};
