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

// ---------------------------------------------------------------------------
// Companies, members and invitations (the auth library's organization endpoints)
// ---------------------------------------------------------------------------

export type TestOrganization = { id: string; slug: string; name: string };

export function uniqueSlug(): string {
  return `ceg-${randomUUID().slice(0, 12)}`;
}

/** The raw answer to creating a company — for the cases that must be refused. */
export function createOrgResponse(
  testApp: TestApp,
  owner: Actor,
  input: { name?: string; slug?: string } = {},
): Promise<Response> {
  return request(testApp, owner, "POST", "/api/auth/organization/create", {
    name: input.name ?? "Teszt Erőmű Kft.",
    slug: input.slug ?? uniqueSlug(),
  });
}

export async function createOrg(
  testApp: TestApp,
  owner: Actor,
  input: { name?: string; slug?: string } = {},
): Promise<TestOrganization> {
  const response = await createOrgResponse(testApp, owner, input);
  if (response.status !== 200) {
    throw new Error(`Creating the company failed: ${response.status} ${await response.text()}`);
  }
  const { id, slug, name } = await json<TestOrganization>(response);
  return { id, slug, name };
}

export function inviteResponse(
  testApp: TestApp,
  inviter: Actor,
  organization: { id: string },
  email: string,
  role: "admin" | "member",
): Promise<Response> {
  return request(testApp, inviter, "POST", "/api/auth/organization/invite-member", {
    email,
    role,
    organizationId: organization.id,
  });
}

/** Invites an address and returns the invitation's id, read from the link in the mail. */
export async function invite(
  testApp: TestApp,
  inviter: Actor,
  organization: { id: string },
  email: string,
  role: "admin" | "member",
): Promise<string> {
  const response = await inviteResponse(testApp, inviter, organization, email, role);
  if (response.status !== 200) {
    throw new Error(`Inviting ${email} failed: ${response.status} ${await response.text()}`);
  }
  const invitationId = new URL(linkIn(lastMailTo(testApp, email))).pathname.split("/").pop();
  if (!invitationId) throw new Error("The invitation mail has no invitation id in its link");
  return invitationId;
}

export function acceptInvitation(
  testApp: TestApp,
  invitee: Actor,
  invitationId: string,
): Promise<Response> {
  return request(testApp, invitee, "POST", "/api/auth/organization/accept-invitation", {
    invitationId,
  });
}

export function cancelInvitation(
  testApp: TestApp,
  canceller: Actor,
  invitationId: string,
): Promise<Response> {
  return request(testApp, canceller, "POST", "/api/auth/organization/cancel-invitation", {
    invitationId,
  });
}

/** Invites a brand-new user, signs them up and accepts: the result is a member of the company. */
export async function inviteAndAccept(
  testApp: TestApp,
  owner: Actor,
  organization: { id: string },
  role: "admin" | "member",
): Promise<Actor> {
  const email = uniqueEmail();
  const invitationId = await invite(testApp, owner, organization, email, role);
  const newMember = await signUpVerified(testApp, { email });
  const accepted = await acceptInvitation(testApp, newMember, invitationId);
  if (accepted.status !== 200) {
    throw new Error(`Accepting failed: ${accepted.status} ${await accepted.text()}`);
  }
  return newMember;
}

export function removeMember(
  testApp: TestApp,
  remover: Actor,
  organization: { id: string },
  memberEmail: string,
): Promise<Response> {
  return request(testApp, remover, "POST", "/api/auth/organization/remove-member", {
    memberIdOrEmail: memberEmail,
    organizationId: organization.id,
  });
}

export async function updateMemberRole(
  testApp: TestApp,
  changer: Actor,
  organization: { id: string },
  member: Actor,
  role: "owner" | "admin" | "member",
): Promise<Response> {
  const [membership] = await testApp.db.$client`
    select id from member where user_id = ${member.userId} and organization_id = ${organization.id}
  `;
  return request(testApp, changer, "POST", "/api/auth/organization/update-member-role", {
    memberId: membership.id,
    role,
    organizationId: organization.id,
  });
}

export function leaveOrganization(
  testApp: TestApp,
  leaver: Actor,
  organization: { id: string },
): Promise<Response> {
  return request(testApp, leaver, "POST", "/api/auth/organization/leave", {
    organizationId: organization.id,
  });
}

/** The roles of a company's members, as stored. */
export async function memberRoles(
  testApp: TestApp,
  organization: { id: string },
): Promise<string[]> {
  const memberships = await testApp.db.$client`
    select role from member where organization_id = ${organization.id} order by role
  `;
  return memberships.map((membership: { role: string }) => membership.role);
}

export async function countOrganizations(testApp: TestApp, slug: string): Promise<number> {
  const [result] = await testApp.db
    .$client`select count(*)::int as count from organization where slug = ${slug}`;
  return result.count;
}

// ---------------------------------------------------------------------------
// Parks
// ---------------------------------------------------------------------------

export const VALID_PARK = {
  name: "Vega II.",
  latitude: 47.4979,
  longitude: 19.0402,
  timezone: "Europe/Budapest",
};

export type ParkBody = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  status: string;
  fastIntervalS: number;
  billingStartedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function parksPath(organization: { slug: string }, parkId?: string): string {
  const collection = `/api/orgs/${organization.slug}/parks`;
  return parkId ? `${collection}/${parkId}` : collection;
}

/** Creates a park and returns it as the API answered. */
export async function createPark(
  testApp: TestApp,
  manager: Actor,
  organization: { slug: string },
  input: Partial<typeof VALID_PARK> & { fastIntervalS?: number } = {},
): Promise<ParkBody> {
  const response = await request(testApp, manager, "POST", parksPath(organization), {
    ...VALID_PARK,
    ...input,
  });
  if (response.status !== 201) {
    throw new Error(`Creating the park failed: ${response.status} ${await response.text()}`);
  }
  return (await json<{ park: ParkBody }>(response)).park;
}

/** A new owner with a new company: tests that need a clean slate start here. */
export async function createCompany(
  testApp: TestApp,
): Promise<{ owner: Actor; organization: TestOrganization }> {
  const owner = await signUpVerified(testApp);
  const organization = await createOrg(testApp, owner);
  return { owner, organization };
}
