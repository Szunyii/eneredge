import { Hono } from "hono";
import type { AppDeps } from "../app.ts";
import type { Auth } from "../auth.ts";
import { isPlatformAdmin, requireSession, type SessionVars } from "../middleware/session.ts";

/** Who is signed in, and which companies they belong to. */
export type Me = {
  user: { id: string; name: string; email: string; isPlatformAdmin: boolean };
  organizations: { id: string; name: string; slug: string; role: "owner" | "admin" | "member" }[];
};

/** GET /api/me — the first thing the web app asks after loading. */
export function meRoutes(deps: AppDeps, auth: Auth) {
  return new Hono<{ Variables: SessionVars }>().get("/", requireSession(auth), (context) => {
    const user = context.get("user");
    const me: Me = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isPlatformAdmin: isPlatformAdmin(deps.env, user),
      },
      organizations: [],
    };
    return context.json(me, 200);
  });
}
