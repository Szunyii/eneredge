import { customType } from "drizzle-orm/pg-core";

/**
 * A jsonb column that holds an object.
 *
 * drizzle's own `jsonb()` turns the value into JSON text before handing it to the
 * driver, and Bun's SQL client then encodes that text once more: the column ends
 * up holding a JSON *string*, which `->` and `->>` cannot look into. Here the
 * object goes to the driver as it is, and the driver encodes it exactly once.
 */
export const jsonObject = customType<{
  data: Record<string, unknown>;
  driverData: Record<string, unknown>;
}>({
  dataType: () => "jsonb",
  toDriver: (value) => value,
  fromDriver: (value) => value,
});
