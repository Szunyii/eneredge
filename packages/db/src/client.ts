import { SQL } from "bun";
import { type BunSQLDatabase, drizzle } from "drizzle-orm/bun-sql";
import * as schema from "./schema/index.ts";

export type Db = BunSQLDatabase<typeof schema> & { $client: SQL };

/** Opens a connection pool. Connections are made on first use, so this never throws. */
export function createDb(url: string): Db {
  return drizzle({ client: new SQL(url), schema, casing: "snake_case" });
}
