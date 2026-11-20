import type { Db } from "@eneredge/db";
import { createTestDatabase } from "@eneredge/db/testing";
import { type AppType, createApp } from "../src/app.ts";
import type { Env } from "../src/env.ts";
import { createMemoryMailer, type MailMessage } from "../src/mail.ts";

export type TestApp = {
  app: AppType;
  db: Db;
  env: Env;
  outbox: MailMessage[];
  close(): Promise<void>;
};

/** A fresh app on its own throwaway database, with mails collected in `outbox`. */
export async function createTestApp(overrides: Partial<Env> = {}): Promise<TestApp> {
  const database = await createTestDatabase();
  const env: Env = {
    NODE_ENV: "test",
    PORT: 0,
    APP_URL: "http://localhost:3000",
    DATABASE_URL: database.url,
    AUTH_SECRET: "test-secret-that-is-long-enough-0123456789",
    MAIL_TRANSPORT: "log",
    MAIL_FROM: "EnerEdge <no-reply@eneredge.test>",
    PLATFORM_ADMIN_EMAILS: [],
    SIGNUP_MODE: "open",
    ...overrides,
  };
  const mailer = createMemoryMailer();
  const app = createApp({ db: database.db, env, mailer });
  return { app, db: database.db, env, outbox: mailer.outbox, close: database.close };
}
