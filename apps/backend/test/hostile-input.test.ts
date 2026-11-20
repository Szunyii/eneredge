import { afterAll, beforeAll, expect, test } from "bun:test";
import { signUpVerified, uniqueEmail } from "./support/accounts.ts";
import { type Actor, createTestApp, request, type TestApp } from "./support/app.ts";
import { createCompany, type TestOrganization } from "./support/organizations.ts";
import { createPark, parksPath, VALID_PARK } from "./support/parks.ts";

// Input no form would send, but anyone with a terminal can: it must be refused
// with a 4xx, never answered with a 500.
const NUL = "\u0000";
const adminEmail = uniqueEmail();
let testApp: TestApp;
let platformAdmin: Actor;
let owner: Actor;
let organization: TestOrganization;

beforeAll(async () => {
  testApp = await createTestApp({ PLATFORM_ADMIN_EMAILS: [adminEmail] });
  platformAdmin = await signUpVerified(testApp, { email: adminEmail });
  ({ owner, organization } = await createCompany(testApp));
});
afterAll(() => testApp.close());

test("a company slug that cannot exist is a 404 before any query", async () => {
  for (const slug of ["%00", "Nagy%20Betu", "a", `${"a".repeat(41)}`]) {
    const response = await request(testApp, owner, "GET", `/api/orgs/${slug}/parks`);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_found" });
  }
});

test("a park name with a control character is refused as invalid", async () => {
  const created = await createPark(testApp, owner, organization, { name: "Rendes park" });

  for (const name of [`a${NUL}b`, "két\nsor", "tab\tulátor"]) {
    const creating = await request(testApp, owner, "POST", parksPath(organization), {
      ...VALID_PARK,
      name,
    });
    expect(creating.status).toBe(400);
    expect(await creating.json()).toEqual({ error: "validation", fields: { name: "invalid" } });

    const renaming = await request(testApp, owner, "PATCH", parksPath(organization, created.id), {
      name,
    });
    expect(renaming.status).toBe(400);
  }
});

test("admin addresses with a NUL in them are a 404", async () => {
  const removal = await request(
    testApp,
    platformAdmin,
    "DELETE",
    "/api/admin/signup-allowlist/%00",
  );
  expect(removal.status).toBe(404);

  const limitChange = await request(testApp, platformAdmin, "PATCH", "/api/admin/orgs/%00", {
    parkLimit: 20,
  });
  expect(limitChange.status).toBe(404);
});
