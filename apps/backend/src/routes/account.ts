import { randomBytes } from "node:crypto";
import { users } from "@eneredge/db";
import { Hono } from "hono";
import { z } from "zod";
import type { AppDeps } from "../app.ts";
import type { Auth } from "../auth.ts";
import { runInBackground } from "../background.ts";
import { alreadyRegisteredMail } from "../mail-templates.ts";
import { maySignUp } from "../sign-up-policy.ts";
import { displayName, emailAddress, localPath } from "../text-rules.ts";
import { jsonBody } from "../validation.ts";

const signUpSchema = z.object({
  name: displayName,
  email: emailAddress,
  // Where the link in the mail brings the new user once the password is set.
  next: localPath.optional(),
});

type SignUpRequest = z.infer<typeof signUpSchema>;

/**
 * /api/account/* — asking for an account.
 *
 * Signing up never sets a password. It sends a link to the address, and whoever
 * opens that link sets the password: only the owner of a mailbox can finish, so
 * registering someone else's address gains nothing.
 */
export function accountRoutes(deps: AppDeps, auth: Auth) {
  return new Hono().post("/sign-up", jsonBody(signUpSchema), (context) => {
    const signUpRequest = context.req.valid("json");
    // Answered at once and the same for every address: neither the answer nor how
    // long it takes tells whether the address is known, invited or turned away.
    runInBackground("Starting a sign-up", () => startSignUp(deps, auth, signUpRequest));
    return context.json({ status: "ok" } as const, 200);
  });
}

async function startSignUp(deps: AppDeps, auth: Auth, signUpRequest: SignUpRequest) {
  const { name, email, next } = signUpRequest;
  const existingAccount = await users.findByEmail(deps.db, email);

  if (existingAccount?.emailVerified) {
    // The owner is told; the account itself is not touched.
    await deps.mailer.send(
      alreadyRegisteredMail({
        to: existingAccount.email,
        name: existingAccount.name,
        url: signInPageUrl(deps.env.APP_URL, next),
      }),
    );
    return;
  }
  if (!(await maySignUp(deps.db, deps.env, email))) return;

  const isNewAccount = !existingAccount && (await createAccount(deps, auth, { name, email }));
  if (!isNewAccount) {
    // Somebody asked for this account before and never finished — perhaps not the
    // owner of the address. The name typed last is the one that stays.
    await users.renameWhileUnverified(deps.db, email, name);
  }
  // The library mails the link through `sendResetPassword` (see auth.ts).
  await auth.api.requestPasswordReset({ body: { email, redirectTo: next } });
}

/** Returns whether this call created the account; false when another request got there first. */
async function createAccount(
  deps: AppDeps,
  auth: Auth,
  account: { name: string; email: string },
): Promise<boolean> {
  try {
    await auth.api.signUpEmail({ body: { ...account, password: unguessablePassword() } });
    return true;
  } catch (error) {
    // Two requests for one address can arrive at the same moment, and only one
    // of them can create the account. For the other one that is no failure.
    if (await users.findByEmail(deps.db, account.email)) return false;
    throw error;
  }
}

/**
 * The library stores every account with a password. A new account gets one that
 * nobody knows; the real one is set through the mailed link.
 */
function unguessablePassword(): string {
  return randomBytes(32).toString("base64url");
}

function signInPageUrl(appUrl: string, nextPath: string | undefined): string {
  const url = new URL("/sign-in", appUrl);
  if (nextPath) url.searchParams.set("next", nextPath);
  return url.toString();
}
