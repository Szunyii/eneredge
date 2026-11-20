import { expect, test } from "bun:test";
import { runMigrations } from "../src/index.ts";
import { createTestDatabase } from "../src/testing.ts";

test("migrations enable timescaledb and are idempotent", async () => {
  const database = await createTestDatabase();
  const sql = database.db.$client;

  const [extension] = await sql`select extname from pg_extension where extname = 'timescaledb'`;
  expect(extension?.extname).toBe("timescaledb");

  await runMigrations(database.db); // a second run must not throw

  const [generated] = await sql`select uuid_extract_version(uuidv7()) as version`;
  expect(generated.version).toBe(7);

  await database.close();
});

test("test databases are isolated and dropped on close", async () => {
  const first = await createTestDatabase();
  const second = await createTestDatabase();

  await first.db.$client`create table only_in_first()`;
  const [lookup] = await second.db.$client`select to_regclass('only_in_first') as table_name`;
  expect(lookup.table_name).toBeNull();

  const firstName = new URL(first.url).pathname.slice(1);
  await first.close();
  const [remaining] = await second.db.$client`
    select count(*)::int as count from pg_database where datname = ${firstName}
  `;
  expect(remaining.count).toBe(0);

  await second.close();
});
