import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { jsonObject } from "./json-object.ts";

/**
 * Who did what, and when. Rows are only ever added. They deliberately do not
 * reference the company or the user, so the record outlives both.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid().primaryKey().default(sql`uuidv7()`),
    at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    organizationId: text(),
    actorUserId: text(),
    /** What happened, as `<thing>.<verb>`: park.create, org.park_limit.update. */
    action: text().notNull(),
    targetType: text().notNull(),
    targetId: text().notNull(),
    detail: jsonObject().notNull().default(sql`'{}'::jsonb`),
  },
  (table) => [index("audit_log_organization_at_index").on(table.organizationId, table.at.desc())],
);
