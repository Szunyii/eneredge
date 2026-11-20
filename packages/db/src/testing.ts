import { randomBytes } from "node:crypto";
import { SQL } from "bun";
import { createDb, type Db } from "./client.ts";
import { runMigrations } from "./migrate.ts";

const DEFAULT_ADMIN_URL = "postgres://eneredge:eneredge@localhost:54329/postgres";

export type TestDatabase = { url: string; db: Db; close(): Promise<void> };

/**
 * Creates a throwaway, fully migrated database for one test file.
 * `close()` drops it again, so tests never see each other's rows.
 */
export async function createTestDatabase(): Promise<TestDatabase> {
  const adminUrl = process.env.TEST_DATABASE_ADMIN_URL ?? DEFAULT_ADMIN_URL;
  // Hex only, so the name can go into the statements below as it is.
  const name = `eneredge_test_${randomBytes(8).toString("hex")}`;

  await asAdmin(adminUrl, (admin) => admin.unsafe(`create database ${name}`));

  const target = new URL(adminUrl);
  target.pathname = `/${name}`;
  const url = target.toString();
  const db = createDb(url);
  try {
    await runMigrations(db);
  } catch (error) {
    await db.$client.close();
    await asAdmin(adminUrl, (admin) =>
      admin.unsafe(`drop database if exists ${name} with (force)`),
    );
    throw error;
  }

  return {
    url,
    db,
    async close() {
      await db.$client.close();
      await asAdmin(adminUrl, (admin) =>
        admin.unsafe(`drop database if exists ${name} with (force)`),
      );
    },
  };
}

async function asAdmin(adminUrl: string, run: (admin: SQL) => Promise<unknown>): Promise<void> {
  const admin = new SQL(adminUrl, { max: 1 });
  try {
    await run(admin);
  } finally {
    await admin.close();
  }
}
