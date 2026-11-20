import { sql } from "drizzle-orm";
import { check, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth.ts";

/**
 * An address that may create an account while sign-up is by invitation only
 * (SIGNUP_MODE=allowlist). Addresses are stored lower-case.
 */
export const signupAllowlistEntry = pgTable(
  "signup_allowlist",
  {
    email: text().primaryKey(),
    addedBy: text().references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("signup_allowlist_email_is_lowercase", sql`${table.email} = lower(${table.email})`),
  ],
);
