import { createDb, type Db } from "@eneredge/db";
import { type Env, loadEnv } from "./env.ts";
import { createMailer } from "./mail.ts";
import { logUnhandledRejections } from "./process-guard.ts";
import { startServer } from "./server.ts";

declare global {
  // Survives `bun --hot` reloads, so editing server code does not pile up connection pools.
  var eneredgeDb: Db | undefined;
}

logUnhandledRejections();

let env: Env;
try {
  env = loadEnv();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

globalThis.eneredgeDb ??= createDb(env.DATABASE_URL);
const server = startServer({ db: globalThis.eneredgeDb, env, mailer: createMailer(env) });
console.log(`EnerEdge is listening on ${server.url}`);
