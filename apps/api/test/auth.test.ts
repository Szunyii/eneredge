import { afterAll, beforeAll, expect, test } from "bun:test";
import { signupAllowlist } from "@eneredge/db";
import { isPlatformAdmin } from "../src/middleware/session.ts";
import type { Me } from "../src/routes/me.ts";
import {
  cookiesFrom,
  countUsers,
  createTestApp,
  DEFAULT_PASSWORD,
  json,
  lastMailTo,
  linkIn,
  openLink,
  request,
  requestPasswordReset,
  resetPassword,
  signIn,
  signUp,
  signUpVerified,
  type TestApp,
  uniqueEmail,
} from "./helpers.ts";

let testApp: TestApp;
beforeAll(async () => {
  testApp = await createTestApp();
});
afterAll(() => testApp.close());

test("sign-up sends a verification mail and sign-in is refused until verified", async () => {
  const email = uniqueEmail();
  const signUpResponse = await signUp(testApp, { email });
  expect(signUpResponse.status).toBe(200);
  expect(linkIn(lastMailTo(testApp, email)).startsWith(`${testApp.env.APP_URL}/`)).toBe(true);

  const signInResponse = await signIn(testApp, email, DEFAULT_PASSWORD);
  expect(signInResponse.status).not.toBe(200);
  expect(cookiesFrom(signInResponse)).toBeNull();
});

test("the verification link signs the user in", async () => {
  const email = uniqueEmail();
  await signUp(testApp, { email, name: "Teszt Elek" });
  const verification = await openLink(testApp, linkIn(lastMailTo(testApp, email)));
  const cookie = cookiesFrom(verification);
  expect(cookie).not.toBeNull();

  const response = await request(
    testApp,
    { cookie: cookie as string, userId: "", email },
    "GET",
    "/api/me",
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    user: { email, name: "Teszt Elek", isPlatformAdmin: false },
    organizations: [],
  });
});

test("signing up twice with the same e-mail does not reveal the account", async () => {
  const email = uniqueEmail();
  const first = await signUp(testApp, { email, name: "Első" });
  const second = await signUp(testApp, { email, name: "Második", password: "egy-masik-jelszo-42" });

  expect(second.status).toBe(first.status);
  const firstBody = (await first.json()) as Record<string, unknown>;
  const secondBody = (await second.json()) as Record<string, unknown>;
  expect(Object.keys(secondBody).sort()).toEqual(Object.keys(firstBody).sort());
  expect(await countUsers(testApp, email)).toBe(1);
});

test("a 9-character password is rejected", async () => {
  const email = uniqueEmail();
  const response = await signUp(testApp, { email, password: "123456789" });
  expect(response.status).toBeGreaterThanOrEqual(400);
  expect(response.status).toBeLessThan(500);
  expect(await countUsers(testApp, email)).toBe(0);
});

test("password reset sets a new password and revokes old sessions", async () => {
  const user = await signUpVerified(testApp);
  const newPassword = "vadonatuj-jelszo-2026";

  await requestPasswordReset(testApp, user.email);
  const resetLink = new URL(linkIn(lastMailTo(testApp, user.email)));
  expect(`${resetLink.origin}${resetLink.pathname}`).toBe(`${testApp.env.APP_URL}/reset-password`);
  const token = resetLink.searchParams.get("token") as string;

  const resetResponse = await resetPassword(testApp, token, newPassword);
  expect(resetResponse.status).toBe(200);

  expect((await request(testApp, user, "GET", "/api/me")).status).toBe(401);
  expect((await signIn(testApp, user.email, newPassword)).status).toBe(200);
  expect((await signIn(testApp, user.email, DEFAULT_PASSWORD)).status).not.toBe(200);
});

test("a password reset for an unknown address answers the same and sends nothing", async () => {
  const user = await signUpVerified(testApp);
  const knownResponse = await requestPasswordReset(testApp, user.email);
  const mailsBefore = testApp.outbox.length;

  const unknownEmail = uniqueEmail();
  const unknownResponse = await requestPasswordReset(testApp, unknownEmail);

  expect(unknownResponse.status).toBe(knownResponse.status);
  expect(testApp.outbox.length).toBe(mailsBefore);
});

test("GET /api/me is 401 without a session", async () => {
  const response = await request(testApp, null, "GET", "/api/me");
  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ error: "unauthenticated" });
});

test("isPlatformAdmin is true only for a verified address listed in PLATFORM_ADMIN_EMAILS", async () => {
  const adminEmail = uniqueEmail();
  const adminApp = await createTestApp({ PLATFORM_ADMIN_EMAILS: [adminEmail] });
  try {
    const admin = await signUpVerified(adminApp, { email: adminEmail });
    const someoneElse = await signUpVerified(adminApp);

    const adminProfile = await json<Me>(await request(adminApp, admin, "GET", "/api/me"));
    const otherProfile = await json<Me>(await request(adminApp, someoneElse, "GET", "/api/me"));
    expect(adminProfile.user.isPlatformAdmin).toBe(true);
    expect(otherProfile.user.isPlatformAdmin).toBe(false);

    const listed = { id: "u1", name: "Admin", email: adminEmail.toUpperCase() };
    expect(isPlatformAdmin(adminApp.env, { ...listed, emailVerified: true })).toBe(true);
    expect(isPlatformAdmin(adminApp.env, { ...listed, emailVerified: false })).toBe(false);
  } finally {
    await adminApp.close();
  }
});

test("in allowlist mode an unknown address cannot sign up", async () => {
  const closedApp = await createTestApp({ SIGNUP_MODE: "allowlist" });
  try {
    const email = uniqueEmail();
    const response = await signUp(closedApp, { email });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
    expect(await response.json()).toMatchObject({ code: "SIGNUP_CLOSED" });
    expect(await countUsers(closedApp, email)).toBe(0);
    expect(closedApp.outbox).toHaveLength(0);
  } finally {
    await closedApp.close();
  }
});

test("in allowlist mode an allowlisted address and a platform admin can sign up", async () => {
  const adminEmail = uniqueEmail();
  const allowedEmail = uniqueEmail();
  const closedApp = await createTestApp({
    SIGNUP_MODE: "allowlist",
    PLATFORM_ADMIN_EMAILS: [adminEmail],
  });
  try {
    await signupAllowlist.add(closedApp.db, { email: allowedEmail, addedBy: null });

    for (const email of [adminEmail, allowedEmail]) {
      const response = await signUp(closedApp, { email });
      expect(response.status).toBe(200);
      expect(linkIn(lastMailTo(closedApp, email))).toContain(closedApp.env.APP_URL);
    }
  } finally {
    await closedApp.close();
  }
});

test("only a platform admin can manage the allowlist", async () => {
  const adminEmail = uniqueEmail();
  const closedApp = await createTestApp({
    SIGNUP_MODE: "allowlist",
    PLATFORM_ADMIN_EMAILS: [adminEmail],
  });
  try {
    const admin = await signUpVerified(closedApp, { email: adminEmail });
    const ordinaryEmail = uniqueEmail();
    await signupAllowlist.add(closedApp.db, { email: ordinaryEmail, addedBy: null });
    const ordinaryUser = await signUpVerified(closedApp, { email: ordinaryEmail });
    const newcomerEmail = uniqueEmail();
    const allowlistPath = "/api/admin/signup-allowlist";

    // Nobody but a platform admin gets in.
    expect((await request(closedApp, null, "GET", allowlistPath)).status).toBe(401);
    for (const [method, path, body] of [
      ["GET", allowlistPath, undefined],
      ["POST", allowlistPath, { email: newcomerEmail }],
      ["DELETE", `${allowlistPath}/${encodeURIComponent(ordinaryEmail)}`, undefined],
    ] as const) {
      const response = await request(closedApp, ordinaryUser, method, path, body);
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "forbidden" });
    }

    // The admin allows an address (stored lower-case), and that address can then sign up.
    const added = await request(closedApp, admin, "POST", allowlistPath, {
      email: `  ${newcomerEmail.toUpperCase()} `,
    });
    expect(added.status).toBe(201);
    expect(await added.json()).toEqual({ email: newcomerEmail });
    expect((await signUp(closedApp, { email: newcomerEmail })).status).toBe(200);

    const listed = await json<{ emails: { email: string; createdAt: string }[] }>(
      await request(closedApp, admin, "GET", allowlistPath),
    );
    expect(listed.emails.map((entry) => entry.email)).toEqual(
      [newcomerEmail, ordinaryEmail].sort(),
    );
    expect(Number.isNaN(Date.parse(listed.emails[0]?.createdAt ?? ""))).toBe(false);

    // Once removed, an address is closed out again.
    const withdrawnEmail = uniqueEmail();
    await request(closedApp, admin, "POST", allowlistPath, { email: withdrawnEmail });
    const withdrawnPath = `${allowlistPath}/${encodeURIComponent(withdrawnEmail)}`;
    expect((await request(closedApp, admin, "DELETE", withdrawnPath)).status).toBe(204);
    expect((await request(closedApp, admin, "DELETE", withdrawnPath)).status).toBe(404);
    expect(await (await signUp(closedApp, { email: withdrawnEmail })).json()).toMatchObject({
      code: "SIGNUP_CLOSED",
    });
  } finally {
    await closedApp.close();
  }
});

test("adding something that is not an e-mail address to the allowlist is a validation error", async () => {
  const adminEmail = uniqueEmail();
  const adminApp = await createTestApp({ PLATFORM_ADMIN_EMAILS: [adminEmail] });
  try {
    const admin = await signUpVerified(adminApp, { email: adminEmail });
    const path = "/api/admin/signup-allowlist";

    const notAnAddress = await request(adminApp, admin, "POST", path, { email: "nem-cím" });
    expect(notAnAddress.status).toBe(400);
    expect(await notAnAddress.json()).toEqual({
      error: "validation",
      fields: { email: "invalid" },
    });

    const missing = await request(adminApp, admin, "POST", path, {});
    expect(missing.status).toBe(400);
    expect(await missing.json()).toEqual({ error: "validation", fields: { email: "required" } });
  } finally {
    await adminApp.close();
  }
});
