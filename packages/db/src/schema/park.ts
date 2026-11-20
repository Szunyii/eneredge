import { sql } from "drizzle-orm";
import {
  check,
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { organization, user } from "./auth.ts";

/**
 * Where a park stands. `draft` is a park that was added but not connected yet;
 * the other states are set by the platform as the connection and the data come and go.
 */
export const parkStatus = pgEnum("park_status", [
  "draft",
  "connecting",
  "online",
  "degraded",
  "offline",
]);

/** A solar park of a company. */
export const park = pgTable(
  "park",
  {
    id: uuid().primaryKey().default(sql`uuidv7()`),
    organizationId: text()
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text().notNull(),
    latitude: doublePrecision().notNull(),
    longitude: doublePrecision().notNull(),
    /** IANA name, e.g. Europe/Budapest: times of this park are shown in it. */
    timezone: text().notNull(),
    status: parkStatus().notNull().default("draft"),
    /** Target seconds between two fast polls of the park's devices. */
    fastIntervalS: integer().notNull().default(5),
    billingStartedAt: timestamp({ withTimezone: true }),
    createdBy: text().references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // "Vega" and "vega" are the same name within a company.
    uniqueIndex("park_organization_name_unique").on(
      table.organizationId,
      sql`lower(${table.name})`,
    ),
    check("park_latitude_range", sql`${table.latitude} between -90 and 90`),
    check("park_longitude_range", sql`${table.longitude} between -180 and 180`),
    check("park_fast_interval_range", sql`${table.fastIntervalS} between 5 and 3600`),
  ],
);
