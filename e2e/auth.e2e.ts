import { expect, test } from "bun:test";
import { hu } from "@eneredge/web/hu";
import {
  createOrganization,
  latestLinkFor,
  newUser,
  pathOf,
  scenario,
  signIn,
  signUpAndVerify,
  uniqueCompanyName,
} from "./helpers.ts";

test("sign up, verify, create a company and land on the empty park list", () =>
  scenario(async (open) => {
    const page = await open();
    await signUpAndVerify(page, newUser());
    await page.waitForPath(/^\/onboarding$/);

    const slug = await createOrganization(page, "Teszt Erőmű Kft.");
    expect(slug).toBe("teszt-eromu-kft");
    await page.waitForPath(new RegExp(`^/o/${slug}/parks$`));
    await page.waitForText(hu.parks.empty);
  }));

test("a newly opened page starts signed out", () =>
  scenario(async (open) => {
    const firstPerson = await open();
    await signUpAndVerify(firstPerson, newUser());
    const slug = await createOrganization(firstPerson, uniqueCompanyName());

    const nextPerson = await open();
    await nextPerson.goto(`/o/${slug}/parks`);
    await nextPerson.waitForPath(/^\/sign-in/);
  }));

test("a wrong password shows a Hungarian error and stays on the page", () =>
  scenario(async (open) => {
    const user = newUser();
    await signUpAndVerify(await open(), user);

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
    await signUpAndVerify(registration, user);
    const slug = await createOrganization(registration, uniqueCompanyName());

    const visitor = await open();
    await visitor.goto(`/o/${slug}/settings`);
    await visitor.waitForPath(/^\/sign-in\?next=/);
    await signIn(visitor, user);
    await visitor.waitForPath(new RegExp(`^/o/${slug}/settings$`));
  }));

test("password reset from the e-mail link lets the user sign in with the new password", () =>
  scenario(async (open) => {
    const user = newUser();
    const newPassword = "vadonatuj-jelszo-2026";
    await signUpAndVerify(await open(), user);

    const visitor = await open();
    await visitor.goto("/forgot-password");
    await visitor.fill(hu.auth.email, user.email);
    await visitor.click(hu.auth.sendResetLink);
    await visitor.waitForText(hu.auth.resetLinkSent);

    await visitor.goto(pathOf(await latestLinkFor(user.email, "/reset-password")));
    await visitor.fill(hu.auth.newPassword, newPassword);
    await visitor.click(hu.auth.saveNewPassword);
    await visitor.waitForText(hu.auth.resetDone);

    await signIn(visitor, { email: user.email, password: newPassword });
    await visitor.waitForPath(/^\/onboarding$/);

    const withOldPassword = await open();
    await withOldPassword.goto("/sign-in");
    await signIn(withOldPassword, user);
    await withOldPassword.waitForText(hu.auth.invalidCredentials);
  }));
