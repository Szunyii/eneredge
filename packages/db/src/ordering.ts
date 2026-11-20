import { type AnyColumn, type SQL, sql } from "drizzle-orm";

/**
 * Orders names the way a Hungarian reader expects: "Árok" right after "alma",
 * "Őrség" after "Ond". The database's default order would put every accented
 * initial after "z".
 */
export function inHungarianOrder(column: AnyColumn): SQL {
  return sql`${column} collate "hu-x-icu"`;
}
