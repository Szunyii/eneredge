import { SQL } from "bun";
import { type BunSQLDatabase, drizzle } from "drizzle-orm/bun-sql";
import * as schema from "./schema/index.ts";

export type Db = BunSQLDatabase<typeof schema> & { $client: SQL };

/** Opens a connection pool. Connections are made on first use, so this never throws. */
export function createDb(url: string): Db {
  return drizzle({ client: new SQL(url), schema, casing: "snake_case" });
}

/** The handle a `db.transaction(...)` callback receives. */
export type Transaction = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Whatever can run a query: the database itself, or a transaction on it. */
export type QueryRunner = Db | Transaction;
