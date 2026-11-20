import { randomUUID } from "node:crypto";
import { type Actor, cookiesFrom, request, type TestApp } from "./app.ts";
import { linkIn, mailTo } from "./mail.ts";

// Signing up, setting a password, signing in. These helpers are the only place
// in the tests that knows the endpoints of the sign-up flow and the auth library.

export const DEFAULT_PASSWORD = "helyes-lo-elem-tuzogep";

export function uniqueEmail(): string {
  return `user-${randomUUID()}@example.test`;
}

export type SignUpInput = { email: string; name?: string; next?: string };

/** Asks for an account. The answer is the same for every address; the rest happens by mail. */
export function signUp(testApp: TestApp, input: SignUpInput): Promise<Response> {
  return request(testApp, null, "POST", "/api/account/sign-up", {
    name: input.name ?? "Teszt Elek",
    email: input.email,
    next: input.next,
  });
}

/** The token in the link of the "set your password" mail sent to this address. */
export async function passwordTokenFor(testApp: TestApp, email: string): Promise<string> {
  const link = linkIn(await mailTo(testApp, email, "/reset-password"));
  const token = link.searchParams.get("token");
  if (!token) throw new Error("The password link carries no token");
  return token;
}

export function setPassword(testApp: TestApp, token: string, newPassword: string) {
  return request(testApp, null, "POST", "/api/auth/reset-password", { token, newPassword });
}

export function signIn(testApp: TestApp, email: string, password: string): Promise<Response> {
  return request(testApp, null, "POST", "/api/auth/sign-in/email", { email, password });
}

export function requestPasswordReset(testApp: TestApp, email: string): Promise<Response> {
  return request(testApp, null, "POST", "/api/auth/request-password-reset", { email });
}

/** Signs a new user up, sets their password through the mailed link, and signs them in. */
export async function signUpVerified(
  testApp: TestApp,
  input: { email?: string; name?: string; password?: string } = {},
): Promise<Actor> {
  const email = input.email ?? uniqueEmail();
  const password = input.password ?? DEFAULT_PASSWORD;

  await signUp(testApp, { email, name: input.name });
  const passwordSet = await setPassword(testApp, await passwordTokenFor(testApp, email), password);
  if (passwordSet.status !== 200) {
    throw new Error(`Setting the password failed: ${passwordSet.status}`);
  }
  return signedIn(testApp, email, password);
}

/** Signs an existing user in and returns them as an actor. */
export async function signedIn(testApp: TestApp, email: string, password: string): Promise<Actor> {
  const response = await signIn(testApp, email, password);
  const cookie = cookiesFrom(response);
  if (response.status !== 200 || !cookie) {
    throw new Error(`Signing in as ${email} failed: ${response.status}`);
  }
  const [user] = await testApp.db.$client`select id from "user" where email = ${email}`;
  return { cookie, userId: user.id, email };
}

/** How many accounts exist with this address. */
export async function countUsers(testApp: TestApp, email: string): Promise<number> {
  const [result] = await testApp.db
    .$client`select count(*)::int as count from "user" where email = ${email}`;
  return result.count;
}
