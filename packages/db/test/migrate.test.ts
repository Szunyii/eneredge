import { expect, test } from "bun:test";
import { runMigrations } from "../src/index.ts";
import { createTestDatabase } from "../src/testing.ts";

test("migrations enable timescaledb and are idempotent", async () => {
  const t = await createTestDatabase();
  const [ext] = await t.db.$client`select extname from pg_extension where extname = 'timescaledb'`;
  expect(ext?.extname).toBe("timescaledb");
  await runMigrations(t.db); // second run: must not throw
  const [row] = await t.db.$client`select uuid_extract_version(uuidv7()) as v`;
  expect(row.v).toBe(7);
  await t.close();
});

test("test databases are isolated and dropped on close", async () => {
  const a = await createTestDatabase();
  const b = await createTestDatabase();
  await a.db.$client`create table only_in_a()`;
  const [row] = await b.db.$client`select to_regclass('only_in_a') as r`;
  expect(row.r).toBeNull();
  const name = new URL(a.url).pathname.slice(1);
  await a.close();
  const [gone] = await b.db
    .$client`select count(*)::int as n from pg_database where datname = ${name}`;
  expect(gone.n).toBe(0);
  await b.close();
});
