import type { MiddlewareHandler } from "hono";
import type { Auth } from "../auth.ts";
import type { Env } from "../env.ts";
import { apiError } from "../errors.ts";

/** The signed-in user of a request. */
export type SessionUser = { id: string; email: string; name: string; emailVerified: boolean };

export type SessionVars = { user: SessionUser };

/** Lets a request through only with a valid session, and makes its user available. */
export function requireSession(auth: Auth): MiddlewareHandler<{ Variables: SessionVars }> {
  return async (context, next) => {
    const session = await auth.api.getSession({ headers: context.req.raw.headers });
    if (!session) return apiError(context, 401, "unauthenticated");

    const { id, email, name, emailVerified } = session.user;
    context.set("user", { id, email, name, emailVerified });
    await next();
  };
}

/**
 * Platform admins are the confirmed addresses listed in PLATFORM_ADMIN_EMAILS.
 * An unconfirmed address never counts: anyone could have typed it at sign-up.
 */
export function isPlatformAdmin(env: Env, user: SessionUser): boolean {
  return user.emailVerified && env.PLATFORM_ADMIN_EMAILS.includes(user.email.toLowerCase());
}

/** For routes behind `requireSession`: lets only platform admins through. */
export function requirePlatformAdmin(env: Env): MiddlewareHandler<{ Variables: SessionVars }> {
  return async (context, next) => {
    if (!isPlatformAdmin(env, context.get("user"))) return apiError(context, 403, "forbidden");
    await next();
  };
}
