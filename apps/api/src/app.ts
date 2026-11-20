import type { Db } from "@eneredge/db";
import { Hono } from "hono";
import type { Env } from "./env.ts";
import { apiError } from "./errors.ts";
import type { Mailer } from "./mail.ts";
import { healthRoutes } from "./routes/health.ts";

export type AppDeps = { db: Db; env: Env; mailer: Mailer };

/**
 * The whole HTTP API. Routes are chained so that `AppType` carries their shapes
 * to the typed client of the web app.
 */
export function createApp(deps: AppDeps) {
  const api = new Hono().route("/health", healthRoutes(deps));

  const app = new Hono().route("/api", api);

  app.notFound((context) => apiError(context, 404, "not_found"));
  app.onError((error, context) => {
    // The cause goes to the log; the client only learns that something broke.
    console.error(error);
    return apiError(context, 500, "internal");
  });

  return app;
}

export type AppType = ReturnType<typeof createApp>;
