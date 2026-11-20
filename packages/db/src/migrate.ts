import { join } from "node:path";
import { migrate } from "drizzle-orm/bun-sql/migrator";
import { createDb, type Db } from "./client.ts";

const migrationsFolder = join(import.meta.dir, "..", "migrations");

/** Applies every migration that has not run yet. Safe to call repeatedly. */
export async function runMigrations(db: Db): Promise<void> {
  await migrate(db, { migrationsFolder });
}

// `bun run db:migrate`: no process migrates on its own at start-up.
if (import.meta.main) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const db = createDb(url);
  try {
    await runMigrations(db);
    console.log("Migrations are up to date.");
  } finally {
    await db.$client.close();
  }
}
