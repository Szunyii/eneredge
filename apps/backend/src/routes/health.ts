import type { Db } from "@eneredge/db";
import { sql } from "drizzle-orm";
import { Hono } from "hono";

const DATABASE_TIMEOUT_MS = 2000;

/** GET /api/health — for the uptime check: is the process up and can it reach the database? */
export function healthRoutes(deps: { db: Db }) {
  return new Hono().get("/", async (context) => {
    if (await databaseAnswers(deps.db)) {
      return context.json({ status: "ok", db: "ok" } as const, 200);
    }
    return context.json({ status: "degraded", db: "down" } as const, 503);
  });
}

async function databaseAnswers(db: Db): Promise<boolean> {
  let timer: Timer | undefined;
  const timedOut = new Promise<false>((resolve) => {
    timer = setTimeout(() => resolve(false), DATABASE_TIMEOUT_MS);
  });
  try {
    return await Promise.race([db.execute(sql`select 1`).then(() => true as const), timedOut]);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
