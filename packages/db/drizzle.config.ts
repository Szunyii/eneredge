import { defineConfig } from "drizzle-kit";

// Used by `drizzle-kit generate` only: migrations are generated from the schema
// without a database connection and applied by src/migrate.ts.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./migrations",
  casing: "snake_case",
});
