import type { Db } from "@eneredge/db";
import { Hono } from "hono";
import { createAuth } from "./auth.ts";
import type { Env } from "./env.ts";
import { apiError } from "./errors.ts";
import type { Mailer } from "./mail.ts";
import { adminRoutes } from "./routes/admin.ts";
import { healthRoutes } from "./routes/health.ts";
import { meRoutes } from "./routes/me.ts";

export type AppDeps = { db: Db; env: Env; mailer: Mailer };

/**
 * The whole HTTP API. Routes are chained so that `AppType` carries their shapes
 * to the typed client of the web app.
 */
export function createApp(deps: AppDeps) {
  const auth = createAuth(deps);

  const api = new Hono()
    .route("/health", healthRoutes(deps))
    .route("/me", meRoutes(deps, auth))
    .route("/admin", adminRoutes(deps, auth));

  const app = new Hono()
    // Sign-up, sign-in, sessions, companies and invitations are the auth library's own endpoints.
    .on(["GET", "POST"], "/api/auth/*", (context) => auth.handler(context.req.raw))
    .route("/api", api);

  app.notFound((context) => apiError(context, 404, "not_found"));
  app.onError((error, context) => {
    // The cause goes to the log; the client only learns that something broke.
    console.error(error);
    return apiError(context, 500, "internal");
  });

  return app;
}

export type AppType = ReturnType<typeof createApp>;
