import { afterAll, beforeAll, expect, test } from "bun:test";
import { isPlatformAdmin } from "../src/middleware/session.ts";
import type { Me } from "../src/routes/me.ts";
import { signUpVerified, uniqueEmail } from "./support/accounts.ts";
import { createTestApp, json, request, type TestApp } from "./support/app.ts";
import { uniqueSlug } from "./support/organizations.ts";

const adminEmail = uniqueEmail();
let testApp: TestApp;
beforeAll(async () => {
  testApp = await createTestApp({ PLATFORM_ADMIN_EMAILS: [adminEmail] });
});
afterAll(() => testApp.close());

test("GET /api/me is 401 without a session", async () => {
  const response = await request(testApp, null, "GET", "/api/me");
  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ error: "unauthenticated" });
});

test("isPlatformAdmin is true only for a verified address listed in PLATFORM_ADMIN_EMAILS", async () => {
  const admin = await signUpVerified(testApp, { email: adminEmail });
  const someoneElse = await signUpVerified(testApp);

  const adminProfile = await json<Me>(await request(testApp, admin, "GET", "/api/me"));
  const otherProfile = await json<Me>(await request(testApp, someoneElse, "GET", "/api/me"));
  expect(adminProfile.user.isPlatformAdmin).toBe(true);
  expect(otherProfile.user.isPlatformAdmin).toBe(false);

  const listed = { id: "u1", name: "Admin", email: adminEmail.toUpperCase() };
  expect(isPlatformAdmin(testApp.env, { ...listed, emailVerified: true })).toBe(true);
  expect(isPlatformAdmin(testApp.env, { ...listed, emailVerified: false })).toBe(false);
});

test("a user's name cannot be changed past the rules of the sign-up form", async () => {
  const user = await signUpVerified(testApp, { name: "Rendes Név" });

  const response = await request(testApp, user, "POST", "/api/auth/update-user", {
    name: "Két\nSor",
  });
  expect(response.status).toBe(404);

  const profile = await json<Me>(await request(testApp, user, "GET", "/api/me"));
  expect(profile.user.name).toBe("Rendes Név");
});

test("another site cannot act with a signed-in user's cookie", async () => {
  const user = await signUpVerified(testApp);
  const company = { name: "Idegen Oldalról Kft.", slug: uniqueSlug() };

  const fromElsewhere = await request(
    testApp,
    user,
    "POST",
    "/api/auth/organization/create",
    company,
    "https://evil.example",
  );
  expect(fromElsewhere.status).toBe(403);

  const fromTheApp = await request(testApp, user, "POST", "/api/auth/organization/create", company);
  expect(fromTheApp.status).toBe(200);
});

test("a password link cannot be pointed at another site", async () => {
  const user = await signUpVerified(testApp);
  const response = await request(testApp, null, "POST", "/api/auth/request-password-reset", {
    email: user.email,
    redirectTo: "https://evil.example/landing",
  });
  expect(response.status).toBe(403);
});
