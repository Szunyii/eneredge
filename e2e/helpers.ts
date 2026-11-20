/** What a person does again and again in the tests: signing up, reading mail, creating a company. */
import { randomUUID } from "node:crypto";
import { hu } from "@eneredge/web/hu";
import { openPage, type Page } from "./browser.ts";

/**
 * Runs a scenario and closes every page it opened, whatever happens.
 * `open()` is a new person at a fresh browser; see openPage for what that means
 * for the people who came before.
 */
export async function scenario(play: (open: () => Promise<Page>) => Promise<void>): Promise<void> {
  const opened: Page[] = [];
  try {
    await play(async () => {
      const page = await openPage();
      opened.push(page);
      return page;
    });
  } finally {
    for (const page of opened) page.close();
  }
}

export type NewUser = { name: string; email: string; password: string };

export function uniqueEmail(): string {
  return `e2e-${randomUUID()}@example.test`;
}

export function newUser(name = "Teszt Elek"): NewUser {
  return { name, email: uniqueEmail(), password: "helyes-lo-elem-1" };
}

/** A company name no other test uses, so their slugs never collide. */
export function uniqueCompanyName(): string {
  return `Próba Erőmű ${randomUUID().slice(0, 8)}`;
}

type StoredMail = { to: string; subject: string; text: string };

/**
 * The link from the latest mail to this address whose link contains `containing`
 * (e.g. "/reset-password"). Waits for it: the server writes the mail a moment
 * after it has answered the request.
 */
export async function latestLinkFor(email: string, containing = ""): Promise<string> {
  const mailFile = process.env.E2E_MAIL_FILE;
  if (!mailFile) throw new Error("E2E_MAIL_FILE is not set; run the tests with `bun run e2e`.");

  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const lines = (
      await Bun.file(mailFile)
        .text()
        .catch(() => "")
    )
      .split("\n")
      .filter(Boolean);
    const links = lines
      .map((line) => JSON.parse(line) as StoredMail)
      .filter((mail) => mail.to === email)
      .map((mail) => mail.text.match(/https?:\/\/\S+/)?.[0])
      .filter((link): link is string => link?.includes(containing) ?? false);
    const latest = links.at(-1);
    if (latest) return latest;
    await Bun.sleep(100);
  }
  throw new Error(`No mail with a link containing "${containing}" arrived for ${email}.`);
}

/** A link from a mail, as the path the browser helper takes. */
export function pathOf(link: string): string {
  const url = new URL(link);
  return `${url.pathname}${url.search}`;
}

/** Fills in and sends the sign-up form the page is showing. Ends on the "check your mail" card. */
export async function askForAccount(page: Page, user: NewUser): Promise<void> {
  await page.fill(hu.auth.name, user.name);
  await page.fill(hu.auth.email, user.email);
  await page.click(hu.auth.createAccount);
  await page.waitForText(hu.auth.checkEmailTitle);
}

/** Opens the link of the mail that finishes a sign-up and sets the password there. */
export async function setPasswordThroughMail(page: Page, user: NewUser): Promise<void> {
  await page.goto(pathOf(await latestLinkFor(user.email, "/reset-password")));
  await page.fill(hu.auth.password, user.password);
  await page.click(hu.auth.savePasswordAndSignIn);
  // Signed in once the page has moved on from the password form.
  await page.waitForPath(/^\/(?!reset-password)/);
}

/** Signs up on the sign-up page and sets the password through the mailed link. Ends signed in. */
export async function signUpAndSetPassword(page: Page, user: NewUser): Promise<void> {
  await page.goto("/sign-up");
  await askForAccount(page, user);
  await setPasswordThroughMail(page, user);
}

/** Fills in and sends the sign-in form the page is showing. */
export async function signIn(page: Page, user: { email: string; password: string }) {
  await page.fill(hu.auth.email, user.email);
  await page.fill(hu.auth.password, user.password);
  await page.click(hu.auth.signIn);
}

/** Creates the user's company on the onboarding page and returns its slug. */
export async function createOrganization(page: Page, name: string): Promise<string> {
  await page.waitForPath(/^\/onboarding$/);
  await page.fill(hu.onboarding.companyName, name);
  await page.click(hu.onboarding.create);
  await page.waitForPath(/^\/o\/[^/]+\/parks$/);
  const slug = (await page.path()).split("/")[2];
  if (!slug) throw new Error("The address has no company slug after creating the company.");
  return slug;
}

/** Invites an address as a member, on the settings page of the company. */
export async function inviteColleague(page: Page, slug: string, email: string): Promise<void> {
  await page.goto(`/o/${slug}/settings`);
  await page.fill(hu.settings.inviteEmail, email);
  await page.click(hu.settings.invite);
  await page.waitForText(email);
}

/** Follows the invitation mail as someone without an account: sign up, set a password, accept. */
export async function acceptInvitationAsNewUser(page: Page, user: NewUser): Promise<void> {
  await page.goto(pathOf(await latestLinkFor(user.email, "/accept-invitation/")));
  await page.click(hu.invitation.signUp);
  await askForAccount(page, user);
  // The link in the mail brings the new user back to the invitation.
  await setPasswordThroughMail(page, user);
  await page.click(hu.invitation.accept);
  await page.waitForPath(/^\/o\/[^/]+\/parks$/);
}

/** A new person who signs up and creates a company. Ends on the company's (empty) park list. */
export async function ownerWithCompany(
  open: () => Promise<Page>,
  companyName = uniqueCompanyName(),
): Promise<{ page: Page; user: NewUser; slug: string; companyName: string }> {
  const page = await open();
  const user = newUser();
  await signUpAndSetPassword(page, user);
  const slug = await createOrganization(page, companyName);
  return { page, user, slug, companyName };
}

/** Adds a park through the form, starting anywhere inside the company. Ends on the park's page. */
export async function addPark(page: Page, slug: string, name: string): Promise<void> {
  await page.goto(`/o/${slug}/parks/new`);
  await page.fill(hu.park.name, name);
  await page.fill(hu.park.latitude, "47.4979");
  await page.fill(hu.park.longitude, "19.0402");
  await page.click(hu.park.create);
  await page.waitForPath(new RegExp(`^/o/${slug}/parks/[0-9a-f-]{36}$`));
  await page.waitForText(name);
}
