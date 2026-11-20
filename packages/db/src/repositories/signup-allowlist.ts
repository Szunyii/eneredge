import { asc, eq } from "drizzle-orm";
import type { Db } from "../client.ts";
import { signupAllowlistEntry } from "../schema/index.ts";

export type SignupAllowlistEntry = typeof signupAllowlistEntry.$inferSelect;

/** The addresses that may sign up while registration is by invitation only. */
export const signupAllowlist = {
  list(db: Db): Promise<SignupAllowlistEntry[]> {
    return db.select().from(signupAllowlistEntry).orderBy(asc(signupAllowlistEntry.email));
  },

  async has(db: Db, email: string): Promise<boolean> {
    const found = await db
      .select({ email: signupAllowlistEntry.email })
      .from(signupAllowlistEntry)
      .where(eq(signupAllowlistEntry.email, normalized(email)))
      .limit(1);
    return found.length > 0;
  },

  /** Adding an address that is already listed changes nothing. */
  async add(db: Db, entry: { email: string; addedBy: string | null }): Promise<void> {
    await db
      .insert(signupAllowlistEntry)
      .values({ email: normalized(entry.email), addedBy: entry.addedBy })
      .onConflictDoNothing();
  },

  /** Returns whether the address was on the list. */
  async remove(db: Db, email: string): Promise<boolean> {
    const removed = await db
      .delete(signupAllowlistEntry)
      .where(eq(signupAllowlistEntry.email, normalized(email)))
      .returning({ email: signupAllowlistEntry.email });
    return removed.length > 0;
  },
};

function normalized(email: string): string {
  return email.trim().toLowerCase();
}
