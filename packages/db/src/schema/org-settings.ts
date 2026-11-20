import { sql } from "drizzle-orm";
import { check, integer, pgTable, text } from "drizzle-orm/pg-core";
import { organization } from "./auth.ts";

/**
 * What the platform decides about a company (the company table itself belongs to
 * the auth library). A company without a row has the defaults.
 */
export const organizationSettings = pgTable(
  "org_settings",
  {
    organizationId: text()
      .primaryKey()
      .references(() => organization.id, { onDelete: "cascade" }),
    /** How many parks the company may add. A platform admin can raise it. */
    parkLimit: integer().notNull().default(10),
  },
  (table) => [check("org_settings_park_limit_range", sql`${table.parkLimit} between 1 and 1000`)],
);
