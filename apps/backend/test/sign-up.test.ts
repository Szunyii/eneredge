import { afterAll, beforeAll, expect, spyOn, test } from "bun:test";
import { signupAllowlist } from "@eneredge/db";
import { createApp } from "../src/app.ts";
import type { Mailer } from "../src/mail.ts";
import type { Me } from "../src/routes/me.ts";
import {
  countUsers,
  DEFAULT_PASSWORD,
  passwordTokenFor,
  setPassword,
  signedIn,
  signIn,
  signUp,
  signUpVerified,
  uniqueEmail,
} from "./support/accounts.ts";
import {
  cookiesFrom,
  createTestApp,
  isRefused,
  json,
  request,
  type TestApp,
} from "./support/app.ts";
import { linkIn, mailTo, settledMailCount, waitForMails } from "./support/mail.ts";
import { createOrg, invite } from "./support/organizations.ts";

let testApp: TestApp;
beforeAll(async () => {
  testApp = await createTestApp();
});
afterAll(() => testApp.close());

test("signing up mails a link to set a password; until then nothing can be signed into", async () => {
  const email = uniqueEmail();
  const response = await signUp(testApp, { email });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: "ok" });

  const link = linkIn(await mailTo(testApp, email, "/reset-password"));
  expect(`${link.origin}${link.pathname}`).toBe(`${testApp.env.APP_URL}/reset-password`);
  expect(link.searchParams.get("email")).toBe(email);
  expect(link.searchParams.get("welcome")).toBe("1");

  for (const guess of [DEFAULT_PASSWORD, "", "password"]) {
    const attempt = await signIn(testApp, email, guess);
    expect(attempt.status).not.toBe(200);
    expect(cookiesFrom(attempt)).toBeNull();
  }
});

test("setting the password through the link confirms the address and opens the account", async () => {
  const email = uniqueEmail();
  await signUp(testApp, { email, name: "Teszt Elek" });
  const passwordSet = await setPassword(
    testApp,
    await passwordTokenFor(testApp, email),
    DEFAULT_PASSWORD,
  );
  expect(passwordSet.status).toBe(200);

  const user = await signedIn(testApp, email, DEFAULT_PASSWORD);
  const profile = await json<Me>(await request(testApp, user, "GET", "/api/me"));
  expect(profile).toEqual({
    user: { id: user.userId, name: "Teszt Elek", email, isPlatformAdmin: false },
    organizations: [],
  });
});

test("starting a sign-up with someone else's address gains nothing", async () => {
  const victimEmail = uniqueEmail();
  // A stranger registers the victim's address. They get to choose no password…
  await signUp(testApp, { email: victimEmail, name: "Idegen" });
  // …and the library's own ways of creating or confirming an account are closed.
  const directSignUp = await request(testApp, null, "POST", "/api/auth/sign-up/email", {
    name: "Idegen",
    email: uniqueEmail(),
    password: DEFAULT_PASSWORD,
  });
  const verificationMail = await request(
    testApp,
    null,
    "POST",
    "/api/auth/send-verification-email",
    {
      email: victimEmail,
    },
  );
  const verification = await request(testApp, null, "GET", "/api/auth/verify-email?token=anything");
  for (const response of [directSignUp, verificationMail, verification]) {
    expect(response.status).toBe(404);
  }

  // The victim opens the mail and sets a password: the account is theirs alone.
  await setPassword(testApp, await passwordTokenFor(testApp, victimEmail), "az-aldozat-jelszava-1");
  expect((await signIn(testApp, victimEmail, "az-aldozat-jelszava-1")).status).toBe(200);
  expect(await countUsers(testApp, victimEmail)).toBe(1);
});

test("the first mail to an unconfirmed address carries nothing the requester typed", async () => {
  const email = uniqueEmail();
  await signUp(testApp, { email, name: "Nyertél! Kattints: evil.example" });

  const firstMail = await mailTo(testApp, email, "/reset-password");
  expect(`${firstMail.subject} ${firstMail.text}`).not.toContain("Nyertél");
  expect(firstMail.text.match(/https?:\/\/\S+/g)).toHaveLength(1);
});

test("signing up again before finishing takes the newer name", async () => {
  const email = uniqueEmail();
  await signUp(testApp, { email, name: "Valaki Más" });
  await waitForMails(testApp, email, 1);
  await signUp(testApp, { email, name: "Az Igazi Gazda" });
  await waitForMails(testApp, email, 2);

  await setPassword(testApp, await passwordTokenFor(testApp, email), DEFAULT_PASSWORD);
  const user = await signedIn(testApp, email, DEFAULT_PASSWORD);
  const profile = await json<Me>(await request(testApp, user, "GET", "/api/me"));
  expect(profile.user.name).toBe("Az Igazi Gazda");
  expect(await countUsers(testApp, email)).toBe(1);
});

test("two sign-ups for one address at the same moment end in one working account", async () => {
  const email = uniqueEmail();
  // The auth library logs the insert that lost the race; that is expected here.
  const logged = spyOn(console, "error").mockImplementation(() => {});
  try {
    await Promise.all([signUp(testApp, { email }), signUp(testApp, { email })]);
    await waitForMails(testApp, email, 2);
  } finally {
    logged.mockRestore();
  }

  expect(await countUsers(testApp, email)).toBe(1);
  await setPassword(testApp, await passwordTokenFor(testApp, email), DEFAULT_PASSWORD);
  expect((await signIn(testApp, email, DEFAULT_PASSWORD)).status).toBe(200);
});

test("signing up with the address of a finished account answers the same and changes nothing", async () => {
  const owner = await signUpVerified(testApp, { name: "Régi Tag" });
  const mailsBefore = await settledMailCount(testApp, owner.email);

  const response = await signUp(testApp, {
    email: owner.email,
    name: "Betolakodó",
    next: "/accept-invitation/abc123",
  });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: "ok" });

  // The owner is told in one mail, whose link leads to signing in — not to a new password.
  const notice = linkIn(await mailTo(testApp, owner.email, "/sign-in"));
  expect(notice.toString()).toBe(
    `${testApp.env.APP_URL}/sign-in?next=%2Faccept-invitation%2Fabc123`,
  );
  expect(await settledMailCount(testApp, owner.email)).toBe(mailsBefore + 1);

  // Their name, password and session are untouched.
  const profile = await json<Me>(await request(testApp, owner, "GET", "/api/me"));
  expect(profile.user.name).toBe("Régi Tag");
  expect((await signIn(testApp, owner.email, DEFAULT_PASSWORD)).status).toBe(200);
});

test("the link brings the new user back to where they were headed, never elsewhere", async () => {
  const email = uniqueEmail();
  await signUp(testApp, { email, next: "/accept-invitation/abc123" });
  const link = linkIn(await mailTo(testApp, email, "/reset-password"));
  expect(link.searchParams.get("next")).toBe("/accept-invitation/abc123");

  for (const next of ["https://evil.example", "//evil.example", "/\t/evil.example", "o/acme"]) {
    const response = await signUp(testApp, { email: uniqueEmail(), next });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "validation", fields: { next: "invalid" } });
  }
});

const faultySignUps: [description: string, body: unknown, field: string, code: string][] = [
  ["no name", { email: "a@example.test" }, "name", "required"],
  ["a blank name", { name: "   ", email: "a@example.test" }, "name", "required"],
  ["a name of two lines", { name: "Egy\nKettő", email: "a@example.test" }, "name", "invalid"],
  ["a 101-character name", { name: "x".repeat(101), email: "a@example.test" }, "name", "too_long"],
  ["no address", { name: "Teszt Elek" }, "email", "required"],
  [
    "something that is not an address",
    { name: "Teszt Elek", email: "nem-cím" },
    "email",
    "invalid",
  ],
];

test.each(faultySignUps)("sign-up refuses %s", async (_description, body, field, code) => {
  const response = await request(testApp, null, "POST", "/api/account/sign-up", body);
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: "validation", fields: { [field]: code } });
});

test("the public configuration says whether sign-up is by invitation", async () => {
  const closedApp = await createTestApp({ SIGNUP_MODE: "allowlist" });
  try {
    expect(await (await request(testApp, null, "GET", "/api/config")).json()).toEqual({
      signupMode: "open",
    });
    expect(await (await request(closedApp, null, "GET", "/api/config")).json()).toEqual({
      signupMode: "allowlist",
    });
  } finally {
    await closedApp.close();
  }
});

test("in allowlist mode every address gets the same answer, and only the allowed ones a mail", async () => {
  const adminEmail = uniqueEmail();
  const allowedEmail = uniqueEmail();
  const invitedEmail = uniqueEmail();
  const strangerEmail = uniqueEmail();
  const closedApp = await createTestApp({
    SIGNUP_MODE: "allowlist",
    PLATFORM_ADMIN_EMAILS: [adminEmail],
  });
  try {
    await signupAllowlist.add(closedApp.db, { email: allowedEmail, addedBy: null });
    const admin = await signUpVerified(closedApp, { email: adminEmail });
    const organization = await createOrg(closedApp, admin);
    await invite(closedApp, admin, organization, invitedEmail, "member");

    const answers = [];
    for (const email of [allowedEmail, invitedEmail, strangerEmail]) {
      const response = await signUp(closedApp, { email });
      answers.push({ status: response.status, body: await response.json() });
    }
    expect(answers).toEqual(Array(3).fill({ status: 200, body: { status: "ok" } }));

    // Allowed and invited addresses can finish; the stranger got nothing and has no account.
    await mailTo(closedApp, allowedEmail, "/reset-password");
    await mailTo(closedApp, invitedEmail, "/reset-password");
    expect(await settledMailCount(closedApp, strangerEmail)).toBe(0);
    expect(await countUsers(closedApp, strangerEmail)).toBe(0);
  } finally {
    await closedApp.close();
  }
});

test("a sign-up is answered even when the mail server is down, and the failure is logged", async () => {
  const brokenMailer: Mailer = { send: () => Promise.reject(new Error("SMTP connection refused")) };
  const app = createApp({ db: testApp.db, env: testApp.env, mailer: brokenMailer });
  const logged = spyOn(console, "error").mockImplementation(() => {});
  try {
    const email = uniqueEmail();
    const response = await app.request(`${testApp.env.APP_URL}/api/account/sign-up`, {
      method: "POST",
      headers: { Origin: testApp.env.APP_URL, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Teszt Elek", email }),
    });
    expect(response.status).toBe(200);

    await Bun.sleep(300);
    expect(logged.mock.calls.flat().map(String).join(" ")).toContain("SMTP connection refused");
    expect(isRefused(response)).toBe(false);
  } finally {
    logged.mockRestore();
  }
});
