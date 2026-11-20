import { afterAll, beforeAll, expect, test } from "bun:test";
import {
  DEFAULT_PASSWORD,
  passwordTokenFor,
  requestPasswordReset,
  setPassword,
  signIn,
  signUpVerified,
  uniqueEmail,
} from "./support/accounts.ts";
import { createTestApp, isRefused, request, type TestApp } from "./support/app.ts";
import { linkIn, mailTo, settledMailCount } from "./support/mail.ts";

let testApp: TestApp;
beforeAll(async () => {
  testApp = await createTestApp();
});
afterAll(() => testApp.close());

test("password reset sets a new password and revokes old sessions", async () => {
  const user = await signUpVerified(testApp);
  const newPassword = "vadonatuj-jelszo-2026";
  const mailsBefore = await settledMailCount(testApp, user.email);

  await requestPasswordReset(testApp, user.email);
  expect(await settledMailCount(testApp, user.email)).toBe(mailsBefore + 1);
  const link = linkIn(await mailTo(testApp, user.email, "/reset-password"));
  // A finished account gets the plain reset wording, not the welcome.
  expect(link.searchParams.has("welcome")).toBe(false);

  const reset = await setPassword(testApp, link.searchParams.get("token") as string, newPassword);
  expect(reset.status).toBe(200);

  expect((await request(testApp, user, "GET", "/api/me")).status).toBe(401);
  expect((await signIn(testApp, user.email, newPassword)).status).toBe(200);
  expect((await signIn(testApp, user.email, DEFAULT_PASSWORD)).status).not.toBe(200);
});

test("a password reset for an unknown address answers the same and sends nothing", async () => {
  const user = await signUpVerified(testApp);
  const knownResponse = await requestPasswordReset(testApp, user.email);

  const unknownEmail = uniqueEmail();
  const unknownResponse = await requestPasswordReset(testApp, unknownEmail);

  expect(unknownResponse.status).toBe(knownResponse.status);
  expect(await settledMailCount(testApp, unknownEmail)).toBe(0);
});

test("a password link works once", async () => {
  const user = await signUpVerified(testApp);
  await requestPasswordReset(testApp, user.email);
  const token = await passwordTokenFor(testApp, user.email);

  expect((await setPassword(testApp, token, "elso-uj-jelszo-2026")).status).toBe(200);
  expect(isRefused(await setPassword(testApp, token, "masodik-uj-jelszo-2026"))).toBe(true);
  expect((await signIn(testApp, user.email, "elso-uj-jelszo-2026")).status).toBe(200);
});

test("a password link is good for a day", async () => {
  const user = await signUpVerified(testApp);
  await requestPasswordReset(testApp, user.email);
  await mailTo(testApp, user.email, "/reset-password");

  const [latest] = await testApp.db.$client`
    select extract(epoch from (expires_at - created_at))::int as lifetime_seconds
    from verification order by created_at desc limit 1
  `;
  const oneDay = 24 * 60 * 60;
  expect(Math.abs(latest.lifetime_seconds - oneDay)).toBeLessThan(60);
});

test("a 9-character password is refused when it is set", async () => {
  const email = uniqueEmail();
  await request(testApp, null, "POST", "/api/account/sign-up", { name: "Rövid Jelszó", email });
  const response = await setPassword(testApp, await passwordTokenFor(testApp, email), "123456789");

  expect(isRefused(response)).toBe(true);
  expect((await signIn(testApp, email, "123456789")).status).not.toBe(200);
});
