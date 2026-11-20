import { and, eq } from "drizzle-orm";
import type { Db } from "../client.ts";
import { user } from "../schema/index.ts";

export type UserAccount = { id: string; name: string; email: string; emailVerified: boolean };

/**
 * User accounts are created and signed in by the auth library. These are the few
 * things the platform's own sign-up flow reads and writes on them directly.
 */
export const users = {
  /** The account of an address; addresses are stored lower-case. */
  async findByEmail(db: Db, email: string): Promise<UserAccount | null> {
    const [found] = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
      })
      .from(user)
      .where(eq(user.email, normalized(email)))
      .limit(1);
    return found ?? null;
  },

  /**
   * Gives a new name to the account of an address that is not confirmed yet. Once
   * the owner of the address has finished signing up, this changes nothing.
   */
  async renameWhileUnverified(db: Db, email: string, name: string): Promise<void> {
    await db
      .update(user)
      .set({ name })
      .where(and(eq(user.email, normalized(email)), eq(user.emailVerified, false)));
  },

  async markEmailVerified(db: Db, userId: string): Promise<void> {
    await db.update(user).set({ emailVerified: true }).where(eq(user.id, userId));
  },
};

function normalized(email: string): string {
  return email.trim().toLowerCase();
}
