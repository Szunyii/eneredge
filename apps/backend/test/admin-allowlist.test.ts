import { afterAll, beforeAll, expect, test } from "bun:test";
import { signupAllowlist } from "@eneredge/db";
import { countUsers, signUp, signUpVerified, uniqueEmail } from "./support/accounts.ts";
import { type Actor, createTestApp, json, request, type TestApp } from "./support/app.ts";
import { mailTo, settledMailCount } from "./support/mail.ts";

const allowlistPath = "/api/admin/signup-allowlist";
const adminEmail = uniqueEmail();
let closedApp: TestApp;
let admin: Actor;

beforeAll(async () => {
  closedApp = await createTestApp({
    SIGNUP_MODE: "allowlist",
    PLATFORM_ADMIN_EMAILS: [adminEmail],
  });
  admin = await signUpVerified(closedApp, { email: adminEmail });
});
afterAll(() => closedApp.close());

test("only a platform admin can manage the allowlist", async () => {
  const ordinaryEmail = uniqueEmail();
  await signupAllowlist.add(closedApp.db, { email: ordinaryEmail, addedBy: null });
  const ordinaryUser = await signUpVerified(closedApp, { email: ordinaryEmail });

  expect((await request(closedApp, null, "GET", allowlistPath)).status).toBe(401);
  for (const [method, path, body] of [
    ["GET", allowlistPath, undefined],
    ["POST", allowlistPath, { email: uniqueEmail() }],
    ["DELETE", `${allowlistPath}/${encodeURIComponent(ordinaryEmail)}`, undefined],
  ] as const) {
    const response = await request(closedApp, ordinaryUser, method, path, body);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "forbidden" });
  }
});

test("an allowed address can sign up, and no longer once it is removed", async () => {
  const newcomerEmail = uniqueEmail();

  // Stored lower-case, whatever the admin typed.
  const added = await request(closedApp, admin, "POST", allowlistPath, {
    email: `  ${newcomerEmail.toUpperCase()} `,
  });
  expect(added.status).toBe(201);
  expect(await added.json()).toEqual({ email: newcomerEmail });

  const listed = await json<{ emails: { email: string; createdAt: string }[] }>(
    await request(closedApp, admin, "GET", allowlistPath),
  );
  const entry = listed.emails.find((candidate) => candidate.email === newcomerEmail);
  expect(Number.isNaN(Date.parse(entry?.createdAt ?? ""))).toBe(false);

  await signUp(closedApp, { email: newcomerEmail });
  await mailTo(closedApp, newcomerEmail, "/reset-password");

  const withdrawnEmail = uniqueEmail();
  await request(closedApp, admin, "POST", allowlistPath, { email: withdrawnEmail });
  const withdrawnPath = `${allowlistPath}/${encodeURIComponent(withdrawnEmail)}`;
  expect((await request(closedApp, admin, "DELETE", withdrawnPath)).status).toBe(204);
  expect((await request(closedApp, admin, "DELETE", withdrawnPath)).status).toBe(404);

  await signUp(closedApp, { email: withdrawnEmail });
  expect(await settledMailCount(closedApp, withdrawnEmail)).toBe(0);
  expect(await countUsers(closedApp, withdrawnEmail)).toBe(0);
});

test("adding something that is not an e-mail address is a validation error", async () => {
  const notAnAddress = await request(closedApp, admin, "POST", allowlistPath, { email: "nem-cím" });
  expect(notAnAddress.status).toBe(400);
  expect(await notAnAddress.json()).toEqual({ error: "validation", fields: { email: "invalid" } });

  const missing = await request(closedApp, admin, "POST", allowlistPath, {});
  expect(missing.status).toBe(400);
  expect(await missing.json()).toEqual({ error: "validation", fields: { email: "required" } });
});
