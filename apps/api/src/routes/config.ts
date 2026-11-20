import { Hono } from "hono";
import type { Env } from "../env.ts";

/** What the web app may tell anyone about how this system is set up. */
export type PublicConfig = { signupMode: Env["SIGNUP_MODE"] };

/**
 * GET /api/config — open to everyone. The sign-up page reads from it whether
 * registration is by invitation only, and says so before anyone types an address.
 */
export function configRoutes(deps: { env: Env }) {
  return new Hono().get("/", (context) => {
    const config: PublicConfig = { signupMode: deps.env.SIGNUP_MODE };
    return context.json(config, 200);
  });
}
