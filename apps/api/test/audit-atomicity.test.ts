import { afterAll, beforeAll, expect, spyOn, test } from "bun:test";
import { signUpVerified, uniqueEmail } from "./support/accounts.ts";
import { type Actor, createTestApp, json, request, type TestApp } from "./support/app.ts";
import { createCompany, type TestOrganization } from "./support/organizations.ts";
import { createPark, type ParkBody, parksPath, VALID_PARK } from "./support/parks.ts";

// A change and its audit row are written together. These tests break the audit
// log on purpose and check that the change does not happen without its record.

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

async function whileTheAuditLogIsBroken(act: () => Promise<void>): Promise<void> {
  await testApp.db.$client.unsafe(`
    create function refuse_audit_rows() returns trigger language plpgsql as $$
    begin
      raise exception 'the audit log is unavailable';
    end $$;
    create trigger refuse_audit_rows before insert on audit_log
      for each row execute function refuse_audit_rows();
  `);
  // The API logs the failures it answers with a 500; they are expected here.
  const logged = spyOn(console, "error").mockImplementation(() => {});
  try {
    await act();
  } finally {
    logged.mockRestore();
    await testApp.db.$client.unsafe(`
      drop trigger refuse_audit_rows on audit_log;
      drop function refuse_audit_rows();
    `);
  }
}

async function parksOf(company: TestOrganization): Promise<ParkBody[]> {
  const response = await request(testApp, owner, "GET", parksPath(company));
  return (await json<{ parks: ParkBody[] }>(response)).parks;
}

test("a park change that cannot be recorded does not happen", async () => {
  const park = await createPark(testApp, owner, organization, { name: "Megmaradó park" });
  const parkPath = parksPath(organization, park.id);

  await whileTheAuditLogIsBroken(async () => {
    const creating = await request(testApp, owner, "POST", parksPath(organization), {
      ...VALID_PARK,
      name: "Nyom nélküli park",
    });
    const renaming = await request(testApp, owner, "PATCH", parkPath, { name: "Átnevezve" });
    const deleting = await request(testApp, owner, "DELETE", parkPath);

    for (const response of [creating, renaming, deleting]) {
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: "internal" });
    }
  });

  expect((await parksOf(organization)).map((listed) => listed.name)).toEqual(["Megmaradó park"]);
});

test("a park limit change that cannot be recorded does not happen", async () => {
  const limitPath = `/api/admin/orgs/${organization.id}`;
  expect(
    (await request(testApp, platformAdmin, "PATCH", limitPath, { parkLimit: 25 })).status,
  ).toBe(200);

  await whileTheAuditLogIsBroken(async () => {
    const response = await request(testApp, platformAdmin, "PATCH", limitPath, { parkLimit: 500 });
    expect(response.status).toBe(500);
  });

  const overview = await json<{ organizations: { id: string; parkLimit: number }[] }>(
    await request(testApp, platformAdmin, "GET", "/api/admin/orgs"),
  );
  expect(overview.organizations.find((company) => company.id === organization.id)?.parkLimit).toBe(
    25,
  );
});
