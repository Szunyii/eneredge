import { expect, test } from "bun:test";
import { hu } from "@eneredge/frontend/hu";
import {
  askForAccount,
  createOrganization,
  inviteColleague,
  latestLinkFor,
  newUser,
  ownerWithCompany,
  pathOf,
  scenario,
  setPasswordThroughMail,
  signIn,
  signUpAndSetPassword,
  uniqueCompanyName,
} from "./helpers.ts";

test("sign up, set a password through the mail, create a company and land on the empty park list", () =>
  scenario(async (open) => {
    const page = await open();
    await signUpAndSetPassword(page, newUser());
    await page.waitForPath(/^\/onboarding$/);

    const slug = await createOrganization(page, "Teszt Erőmű Kft.");
    expect(slug).toBe("teszt-eromu-kft");
    await page.waitForPath(new RegExp(`^/o/${slug}/parks$`));
    await page.waitForText(hu.parks.empty);
  }));

test("a newly opened page starts signed out", () =>
  scenario(async (open) => {
    const firstPerson = await open();
    await signUpAndSetPassword(firstPerson, newUser());
    const slug = await createOrganization(firstPerson, uniqueCompanyName());

    const nextPerson = await open();
    await nextPerson.goto(`/o/${slug}/parks`);
    await nextPerson.waitForPath(/^\/sign-in/);
  }));

test("a wrong password shows a Hungarian error and stays on the page", () =>
  scenario(async (open) => {
    const user = newUser();
    await signUpAndSetPassword(await open(), user);

    const visitor = await open();
    await visitor.goto("/sign-in");
    await signIn(visitor, { email: user.email, password: "ez-nem-a-jelszavam" });
    await visitor.waitForText(hu.auth.invalidCredentials);
    expect(await visitor.path()).toBe("/sign-in");
  }));

test("a signed-out visitor is sent to sign-in and returns to the deep link after signing in", () =>
  scenario(async (open) => {
    const user = newUser();
    const registration = await open();
    await signUpAndSetPassword(registration, user);
    const slug = await createOrganization(registration, uniqueCompanyName());

    const visitor = await open();
    await visitor.goto(`/o/${slug}/settings`);
    await visitor.waitForPath(/^\/sign-in\?next=/);
    await signIn(visitor, user);
    await visitor.waitForPath(new RegExp(`^/o/${slug}/settings$`));
  }));

test("a forgotten password is replaced through the mailed link, which also signs in", () =>
  scenario(async (open) => {
    const user = newUser();
    const newPassword = "vadonatuj-jelszo-2026";
    await signUpAndSetPassword(await open(), user);

    const visitor = await open();
    await visitor.goto("/forgot-password");
    await visitor.fill(hu.auth.email, user.email);
    await visitor.click(hu.auth.sendResetLink);
    await visitor.waitForText(hu.auth.resetLinkSent);

    await visitor.goto(pathOf(await latestLinkFor(user.email, "/reset-password")));
    await visitor.waitForText(hu.auth.resetTitle);
    await visitor.fill(hu.auth.newPassword, newPassword);
    await visitor.click(hu.auth.savePasswordAndSignIn);
    // Signed in: a user without a company is sent to create one.
    await visitor.waitForPath(/^\/onboarding$/);

    const withNewPassword = await open();
    await withNewPassword.goto("/sign-in");
    await signIn(withNewPassword, { email: user.email, password: newPassword });
    await withNewPassword.waitForPath(/^\/onboarding$/);

    const withOldPassword = await open();
    await withOldPassword.goto("/sign-in");
    await signIn(withOldPassword, user);
    await withOldPassword.waitForText(hu.auth.invalidCredentials);
  }));

test("a password link that was already used says so and offers a new one", () =>
  scenario(async (open) => {
    const user = newUser();
    await signUpAndSetPassword(await open(), user);
    const usedLink = pathOf(await latestLinkFor(user.email, "/reset-password"));

    const visitor = await open();
    await visitor.goto(usedLink);
    await visitor.fill(hu.auth.password, "egy-masik-jelszo-2026");
    await visitor.click(hu.auth.savePasswordAndSignIn);
    await visitor.waitForText(hu.auth.resetLinkInvalid);
    expect(await visitor.has(hu.auth.requestNewLink)).toBe(true);
  }));

test("the mail can be asked for again from the check-your-mail card", () =>
  scenario(async (open) => {
    const user = newUser();
    const page = await open();
    await page.goto("/sign-up");
    await askForAccount(page, user);
    const firstLink = await latestLinkFor(user.email, "/reset-password");

    await page.click(hu.auth.resend);
    await page.waitForText(hu.auth.resent);
    await waitForAnotherLink(user.email, firstLink);

    await setPasswordThroughMail(page, user);
    await page.waitForPath(/^\/onboarding$/);
  }));

test("signing up with an address that has an account ends the same way, and mails a way to sign in", () =>
  scenario(async (open) => {
    const user = newUser();
    await signUpAndSetPassword(await open(), user);

    const visitor = await open();
    await visitor.goto("/sign-up");
    await askForAccount(visitor, { ...user, name: "Valaki Más" });

    const link = await latestLinkFor(user.email, "/sign-in");
    await visitor.goto(pathOf(link));
    await signIn(visitor, user);
    await visitor.waitForPath(/^\/onboarding$/);
  }));

test("someone who already has an account accepts an invitation after signing in", () =>
  scenario(async (open) => {
    const colleague = newUser("Kolléga Béla");
    await signUpAndSetPassword(await open(), colleague);

    const { page: ownerPage, slug } = await ownerWithCompany(open);
    await inviteColleague(ownerPage, slug, colleague.email);

    const colleaguePage = await open();
    await colleaguePage.goto(pathOf(await latestLinkFor(colleague.email, "/accept-invitation/")));
    await colleaguePage.click(hu.invitation.signIn);
    await signIn(colleaguePage, colleague);
    // Signing in leads back to the invitation.
    await colleaguePage.click(hu.invitation.accept);
    await colleaguePage.waitForPath(new RegExp(`^/o/${slug}/parks$`));
  }));

/** Waits until a later password mail than `earlierLink` has arrived for this address. */
async function waitForAnotherLink(email: string, earlierLink: string): Promise<void> {
  const deadline = Date.now() + 5000;
  while ((await latestLinkFor(email, "/reset-password")) === earlierLink) {
    if (Date.now() >= deadline) throw new Error(`No second password mail arrived for ${email}.`);
    await Bun.sleep(100);
  }
}
