import { randomUUID } from "node:crypto";
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

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

/** A signed-in user, as the tests see one: the session cookie and who it belongs to. */
export type Actor = { cookie: string; userId: string; email: string };

export const DEFAULT_PASSWORD = "helyes-lo-elem-tuzogep";

export function uniqueEmail(): string {
  return `user-${randomUUID()}@example.test`;
}

/** Sends a JSON request the way the web app does: from its origin, with the actor's cookie. */
export function request(
  testApp: TestApp,
  actor: Actor | null,
  method: string,
  path: string,
  body?: unknown,
): Promise<Response> {
  const headers = new Headers({ Origin: testApp.env.APP_URL });
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

// ---------------------------------------------------------------------------
// Mail
// ---------------------------------------------------------------------------

/** The most recent mail sent to this address. Throws when there is none. */
export function lastMailTo(testApp: TestApp, email: string): MailMessage {
  const mail = testApp.outbox.findLast((message) => message.to === email);
  if (!mail) throw new Error(`No mail was sent to ${email}`);
  return mail;
}

/** The first link in the text of a mail. */
export function linkIn(mail: MailMessage): string {
  const link = mail.text.match(/https?:\/\/\S+/)?.[0];
  if (!link) throw new Error(`The mail "${mail.subject}" has no link`);
  return link;
}

// ---------------------------------------------------------------------------
// Authentication
// These helpers are the only place that knows the auth library's endpoints.
// ---------------------------------------------------------------------------

export type SignUpInput = { email: string; name?: string; password?: string };

export function signUp(testApp: TestApp, input: SignUpInput): Promise<Response> {
  return request(testApp, null, "POST", "/api/auth/sign-up/email", {
    name: input.name ?? "Teszt Elek",
    email: input.email,
    password: input.password ?? DEFAULT_PASSWORD,
  });
}

export function signIn(testApp: TestApp, email: string, password: string): Promise<Response> {
  return request(testApp, null, "POST", "/api/auth/sign-in/email", { email, password });
}

/** Opens a link from a mail, as the browser would, without following redirects. */
export function openLink(testApp: TestApp, link: string, actor: Actor | null = null) {
  return request(testApp, actor, "GET", link);
}

/** Signs a new user up and confirms the address through the mailed link. */
export async function signUpVerified(
  testApp: TestApp,
  input: Partial<SignUpInput> = {},
): Promise<Actor> {
  const email = input.email ?? uniqueEmail();
  const signUpResponse = await signUp(testApp, { ...input, email });
  if (signUpResponse.status !== 200) {
    throw new Error(`Sign-up failed: ${signUpResponse.status} ${await signUpResponse.text()}`);
  }
  const verification = await openLink(testApp, linkIn(lastMailTo(testApp, email)));
  const cookie = cookiesFrom(verification);
  if (!cookie) throw new Error(`Verification set no session cookie (${verification.status})`);

  const [user] = await testApp.db.$client`select id from "user" where email = ${email}`;
  return { cookie, userId: user.id, email };
}

export function requestPasswordReset(testApp: TestApp, email: string): Promise<Response> {
  return request(testApp, null, "POST", "/api/auth/request-password-reset", {
    email,
    redirectTo: "/reset-password",
  });
}

export function resetPassword(
  testApp: TestApp,
  token: string,
  newPassword: string,
): Promise<Response> {
  return request(testApp, null, "POST", "/api/auth/reset-password", { token, newPassword });
}

/** How many accounts exist with this address. */
export async function countUsers(testApp: TestApp, email: string): Promise<number> {
  const [result] = await testApp.db
    .$client`select count(*)::int as count from "user" where email = ${email}`;
  return result.count;
}
