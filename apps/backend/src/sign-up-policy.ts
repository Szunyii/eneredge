import { type Db, invitations, signupAllowlist } from "@eneredge/db";
import type { Env } from "./env.ts";

/**
 * Who may create an account. In `open` mode anyone; in `allowlist` mode only
 * three kinds of address: allowlisted ones, ones holding a pending invitation,
 * and platform admins.
 */
export async function maySignUp(db: Db, env: Env, email: string): Promise<boolean> {
  if (env.SIGNUP_MODE === "open") return true;

  const address = email.trim().toLowerCase();
  if (env.PLATFORM_ADMIN_EMAILS.includes(address)) return true;
  if (await signupAllowlist.has(db, address)) return true;
  return invitations.hasPendingFor(db, address);
}
