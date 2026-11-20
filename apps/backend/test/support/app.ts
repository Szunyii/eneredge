import type { Db } from "@eneredge/db";
import { createTestDatabase } from "@eneredge/db/testing";
import { type AppType, createApp } from "../../src/app.ts";
import type { Env } from "../../src/env.ts";
import { createMemoryMailer, type MailMessage } from "../../src/mail.ts";

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

/** A signed-in user, as the tests see one: the session cookie and who it belongs to. */
export type Actor = { cookie: string; userId: string; email: string };

/**
 * Sends a JSON request the way the web app does: from its origin, with the
 * actor's cookie. `origin` lets a test pretend to be another site.
 */
export function request(
  testApp: TestApp,
  actor: Actor | null,
  method: string,
  path: string,
  body?: unknown,
  origin: string = testApp.env.APP_URL,
): Promise<Response> {
  const headers = new Headers({ Origin: origin });
  if (actor) headers.set("Cookie", actor.cookie);
  if (body !== undefined) headers.set("Content-Type", "application/json");
  return Promise.resolve(
    testApp.app.request(new URL(path, testApp.env.APP_URL).toString(), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

/** The JSON body of a response, as the type the caller expects. */
export async function json<Body>(response: Response): Promise<Body> {
  return (await response.json()) as Body;
}

/** The cookies a response sets, as a Cookie header value; null when it sets none. */
export function cookiesFrom(response: Response): string | null {
  const cookies = response.headers.getSetCookie().map((cookie) => cookie.split(";")[0] as string);
  return cookies.length > 0 ? cookies.join("; ") : null;
}

/** Asserts that a request was turned down as the sender's fault: any 4xx. */
export function isRefused(response: Response): boolean {
  return response.status >= 400 && response.status < 500;
}
