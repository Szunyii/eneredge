import { expect, test } from "bun:test";
import { hu } from "@eneredge/web/hu";
import {
  acceptInvitationAsNewUser,
  addPark,
  createOrganization,
  newUser,
  ownerWithCompany,
  scenario,
  signUpAndVerify,
  uniqueCompanyName,
  uniqueEmail,
} from "./helpers.ts";

test("an owner adds a park and invites a colleague who can see but not change it", () =>
  scenario(async (open) => {
    const page = await open();
    await signUpAndVerify(page, newUser("Tulaj Dona"));
    const slug = await createOrganization(page, "Vega Energia Kft.");

    await page.click(hu.parks.new);
    await page.fill(hu.park.name, "Vega II.");
    await page.fill(hu.park.latitude, "47.4979");
    await page.fill(hu.park.longitude, "19.0402");
    await page.click(hu.park.create);
    await page.waitForText("Vega II.");
    await page.waitForText(hu.status.draft);

    const colleague = newUser("Kolléga Béla");
    await page.goto(`/o/${slug}/settings`);
    await page.fill(hu.settings.inviteEmail, colleague.email);
    await page.click(hu.settings.invite);
    await page.waitForText(colleague.email);

    const other = await open();
    await acceptInvitationAsNewUser(other, colleague);
    await other.goto(`/o/${slug}/parks`);
    await other.waitForText("Vega II.");
    expect(await other.has(hu.parks.new)).toBe(false);
  }));

test("a duplicate park name shows the name-taken message under the field", () =>
  scenario(async (open) => {
    const { page, slug } = await ownerWithCompany(open);
    await addPark(page, slug, "Vega II.");

    await page.goto(`/o/${slug}/parks/new`);
    await page.fill(hu.park.name, "vega ii.");
    await page.fill(hu.park.latitude, "47.5");
    await page.fill(hu.park.longitude, "19.1");
    await page.click(hu.park.create);

    expect(await page.waitForErrorUnder(hu.park.name)).toBe(hu.errors.name_taken);
    expect(await page.path()).toBe(`/o/${slug}/parks/new`);
  }));

test("an out-of-range latitude shows the field error and keeps the entered values", () =>
  scenario(async (open) => {
    const { page, slug } = await ownerWithCompany(open);

    await page.goto(`/o/${slug}/parks/new`);
    await page.fill(hu.park.name, "Vega II.");
    await page.fill(hu.park.latitude, "91");
    await page.fill(hu.park.longitude, "19.0402");
    await page.click(hu.park.create);

    expect(await page.waitForErrorUnder(hu.park.latitude)).toBe(hu.fieldErrors.out_of_range);
    expect(await page.fieldValue(hu.park.name)).toBe("Vega II.");
    expect(await page.path()).toBe(`/o/${slug}/parks/new`);
  }));

test("a coordinate typed with a decimal comma is understood", () =>
  scenario(async (open) => {
    const { page, slug } = await ownerWithCompany(open);

    await page.goto(`/o/${slug}/parks/new`);
    await page.fill(hu.park.name, "Vesszős park");
    await page.fill(hu.park.latitude, "47,4979");
    await page.fill(hu.park.longitude, "19,0402");
    await page.click(hu.park.create);

    await page.waitForPath(new RegExp(`^/o/${slug}/parks/[0-9a-f-]{36}$`));
    await page.waitForText("47,4979");
  }));

test("a park can be renamed on its page", () =>
  scenario(async (open) => {
    const { page, slug } = await ownerWithCompany(open);
    await addPark(page, slug, "Régi név");

    await page.click(hu.park.edit);
    await page.fill(hu.park.name, "Új név");
    await page.click(hu.park.save);
    await page.waitForText("Új név");

    await page.goto(`/o/${slug}/parks`);
    await page.waitForText("Új név");
    expect(await page.has("Régi név")).toBe(false);
  }));

test("deleting a park asks for confirmation and removes it from the list", () =>
  scenario(async (open) => {
    const { page, slug } = await ownerWithCompany(open);
    await addPark(page, slug, "Törlendő park");

    // Backing out of the question leaves the park alone.
    await page.click(hu.park.delete);
    await page.waitForText(hu.park.deleteQuestion);
    await page.click(hu.park.keep);
    await page.goto(`/o/${slug}/parks`);
    await page.waitForText("Törlendő park");

    await page.click("Törlendő park");
    await page.click(hu.park.delete);
    await page.click(hu.park.confirmDelete);
    await page.waitForPath(new RegExp(`^/o/${slug}/parks$`));
    await page.waitForText(hu.parks.empty);
  }));

test("another company's address shows the no-access page", () =>
  scenario(async (open) => {
    const someoneElses = await ownerWithCompany(open);
    await addPark(someoneElses.page, someoneElses.slug, "Idegen park");

    const { page } = await ownerWithCompany(open);
    await page.goto(`/o/${someoneElses.slug}/parks`);
    await page.waitForText(hu.errors.not_found);
    expect(await page.has("Idegen park")).toBe(false);
    expect(await page.has(hu.parks.title)).toBe(false);
  }));

test("signing out closes the pages of the company", () =>
  scenario(async (open) => {
    const { page, slug } = await ownerWithCompany(open);

    await page.click(hu.nav.account);
    await page.click(hu.common.signOut);
    await page.waitForPath(/^\/sign-in/);

    await page.goto(`/o/${slug}/parks`);
    await page.waitForPath(/^\/sign-in\?next=/);
  }));

test("a platform admin allows an address and raises a company's park limit", () =>
  scenario(async (open) => {
    const adminEmail = process.env.E2E_ADMIN_EMAIL;
    if (!adminEmail) throw new Error("E2E_ADMIN_EMAIL is not set; run with `bun run e2e`.");
    const companyName = uniqueCompanyName();
    const allowedEmail = uniqueEmail();

    const page = await open();
    await signUpAndVerify(page, { ...newUser("Admin Anna"), email: adminEmail });
    await createOrganization(page, companyName);

    await page.click(hu.nav.admin);
    await page.fill(hu.admin.allowEmail, allowedEmail);
    await page.click(hu.admin.allow);
    await page.waitForText(allowedEmail);

    expect(await page.fieldValue(hu.admin.parkLimitOf(companyName))).toBe("10");
    await page.fill(hu.admin.parkLimitOf(companyName), "11");
    await page.click(hu.admin.saveLimitOf(companyName));
    await page.waitForText(hu.admin.limitSaved);

    await page.goto("/admin");
    expect(await page.fieldValue(hu.admin.parkLimitOf(companyName))).toBe("11");
  }));

test("someone who is not a platform admin does not get the admin page", () =>
  scenario(async (open) => {
    const { page } = await ownerWithCompany(open);
    expect(await page.has(hu.nav.admin)).toBe(false);

    await page.goto("/admin");
    await page.waitForText(hu.errors.not_found);
    expect(await page.has(hu.admin.allowlistTitle)).toBe(false);
  }));
