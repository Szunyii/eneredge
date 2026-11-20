import { afterAll, beforeAll, expect, test } from "bun:test";
import type { OrganizationOverview } from "@eneredge/db";
import { signUpVerified, uniqueEmail } from "./support/accounts.ts";
import { type Actor, createTestApp, json, request, type TestApp } from "./support/app.ts";
import { createCompany, createOrg } from "./support/organizations.ts";
import { createPark, type ParkBody, parksPath, VALID_PARK } from "./support/parks.ts";

const adminEmail = uniqueEmail();
let testApp: TestApp;
let platformAdmin: Actor;

beforeAll(async () => {
  testApp = await createTestApp({ PLATFORM_ADMIN_EMAILS: [adminEmail] });
  platformAdmin = await signUpVerified(testApp, { email: adminEmail });
});
afterAll(() => testApp.close());

type AuditRow = {
  action: string;
  organization_id: string | null;
  actor_user_id: string | null;
  target_type: string;
  target_id: string;
  detail: Record<string, unknown>;
};

async function auditRowsOf(organizationId: string): Promise<AuditRow[]> {
  return testApp.db.$client`
    select action, organization_id, actor_user_id, target_type, target_id, detail
    from audit_log where organization_id = ${organizationId} order by at, id
  `;
}

test("create returns the park with defaults", async () => {
  const { owner, organization } = await createCompany(testApp);
  const response = await request(testApp, owner, "POST", parksPath(organization), VALID_PARK);

  expect(response.status).toBe(201);
  const { park } = await json<{ park: ParkBody }>(response);
  expect(park).toMatchObject({
    ...VALID_PARK,
    status: "draft",
    fastIntervalS: 5,
    billingStartedAt: null,
  });
  expect(park.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  expect(park.createdAt).toBe(park.updatedAt);
});

test("a created park can be read back on its own and in the list", async () => {
  const { owner, organization } = await createCompany(testApp);
  const created = await createPark(testApp, owner, organization, { fastIntervalS: 60 });

  const single = await request(testApp, owner, "GET", parksPath(organization, created.id));
  expect(single.status).toBe(200);
  expect(await single.json()).toEqual({ park: created });
  expect(created.fastIntervalS).toBe(60);

  const list = await request(testApp, owner, "GET", parksPath(organization));
  expect(await list.json()).toEqual({ parks: [created] });
});

test("list is ordered by name, case-insensitively", async () => {
  const { owner, organization } = await createCompany(testApp);
  for (const name of ["béta", "Alfa", "csillag"]) {
    await createPark(testApp, owner, organization, { name });
  }

  const { parks } = await json<{ parks: ParkBody[] }>(
    await request(testApp, owner, "GET", parksPath(organization)),
  );
  expect(parks.map((park) => park.name)).toEqual(["Alfa", "béta", "csillag"]);
});

test("list follows the Hungarian alphabet, accents included", async () => {
  const { owner, organization } = await createCompany(testApp);
  for (const name of ["Zala", "Árok", "alma", "Őrség", "béta", "Érd", "Úrhida", "Ond"]) {
    await createPark(testApp, owner, organization, { name });
  }

  const { parks } = await json<{ parks: ParkBody[] }>(
    await request(testApp, owner, "GET", parksPath(organization)),
  );
  expect(parks.map((park) => park.name)).toEqual([
    "alma",
    "Árok",
    "béta",
    "Érd",
    "Ond",
    "Őrség",
    "Úrhida",
    "Zala",
  ]);
});

test("patch changes only the given fields and advances updatedAt", async () => {
  const { owner, organization } = await createCompany(testApp);
  const created = await createPark(testApp, owner, organization);
  await Bun.sleep(5);

  const response = await request(testApp, owner, "PATCH", parksPath(organization, created.id), {
    name: "Vega III.",
  });
  expect(response.status).toBe(200);
  const { park } = await json<{ park: ParkBody }>(response);
  expect(park).toEqual({ ...created, name: "Vega III.", updatedAt: park.updatedAt });
  expect(Date.parse(park.updatedAt)).toBeGreaterThan(Date.parse(created.updatedAt));
});

test("a patch that changes nothing leaves the park and the audit log alone", async () => {
  const { owner, organization } = await createCompany(testApp);
  const created = await createPark(testApp, owner, organization);

  for (const unchanged of [{}, { name: created.name, latitude: created.latitude }]) {
    const response = await request(
      testApp,
      owner,
      "PATCH",
      parksPath(organization, created.id),
      unchanged,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ park: created });
  }
  expect((await auditRowsOf(organization.id)).map((row) => row.action)).toEqual(["park.create"]);
});

test("delete returns 204, then 404", async () => {
  const { owner, organization } = await createCompany(testApp);
  const created = await createPark(testApp, owner, organization);
  const path = parksPath(organization, created.id);

  const deleted = await request(testApp, owner, "DELETE", path);
  expect(deleted.status).toBe(204);
  expect(await deleted.text()).toBe("");

  for (const method of ["GET", "DELETE"]) {
    const response = await request(testApp, owner, method, path);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_found" });
  }
});

const faultyParks: [description: string, body: unknown, field: string, code: string][] = [
  ["a name of spaces only", { ...VALID_PARK, name: "   " }, "name", "required"],
  [
    "no name",
    { latitude: 47.4979, longitude: 19.0402, timezone: "Europe/Budapest" },
    "name",
    "required",
  ],
  ["an 81-character name", { ...VALID_PARK, name: "x".repeat(81) }, "name", "too_long"],
  ["a latitude of 91", { ...VALID_PARK, latitude: 91 }, "latitude", "out_of_range"],
  ["a longitude of -181", { ...VALID_PARK, longitude: -181 }, "longitude", "out_of_range"],
  ["a latitude given as text", { ...VALID_PARK, latitude: "47" }, "latitude", "invalid"],
  [
    "a time zone that does not exist",
    { ...VALID_PARK, timezone: "Mars/Olympus" },
    "timezone",
    "invalid",
  ],
  ["a 4-second interval", { ...VALID_PARK, fastIntervalS: 4 }, "fastIntervalS", "out_of_range"],
  ["a fractional interval", { ...VALID_PARK, fastIntervalS: 7.5 }, "fastIntervalS", "invalid"],
];

test.each(faultyParks)("create refuses %s", async (_description, body, field, code) => {
  const { owner, organization } = await createCompany(testApp);
  const response = await request(testApp, owner, "POST", parksPath(organization), body);

  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: "validation", fields: { [field]: code } });
});

test("patch refuses a faulty field the same way", async () => {
  const { owner, organization } = await createCompany(testApp);
  const created = await createPark(testApp, owner, organization);

  const response = await request(testApp, owner, "PATCH", parksPath(organization, created.id), {
    longitude: 500,
  });
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({
    error: "validation",
    fields: { longitude: "out_of_range" },
  });
});

test("a body that is not JSON is a 400, not a 500", async () => {
  const { owner, organization } = await createCompany(testApp);
  const response = await testApp.app.request(
    new URL(parksPath(organization), testApp.env.APP_URL).toString(),
    {
      method: "POST",
      headers: {
        Origin: testApp.env.APP_URL,
        Cookie: owner.cookie,
        "Content-Type": "application/json",
      },
      body: "{nem json",
    },
  );
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: "validation" });
});

test("a JSON body that is not an object is a 400 as well", async () => {
  const { owner, organization } = await createCompany(testApp);
  const response = await request(testApp, owner, "POST", parksPath(organization), ["Vega"]);
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: "validation" });
});

test("names are unique per organization, case-insensitively", async () => {
  const { owner, organization } = await createCompany(testApp);
  await createPark(testApp, owner, organization, { name: "Vega II." });

  const sameCompany = await request(testApp, owner, "POST", parksPath(organization), {
    ...VALID_PARK,
    name: "vega ii.",
  });
  expect(sameCompany.status).toBe(409);
  expect(await sameCompany.json()).toEqual({ error: "name_taken" });

  const otherCompany = await createCompany(testApp);
  const elsewhere = await request(
    testApp,
    otherCompany.owner,
    "POST",
    parksPath(otherCompany.organization),
    { ...VALID_PARK, name: "vega ii." },
  );
  expect(elsewhere.status).toBe(201);
});

test("renaming a park to a name that is taken is refused", async () => {
  const { owner, organization } = await createCompany(testApp);
  await createPark(testApp, owner, organization, { name: "Alfa" });
  const second = await createPark(testApp, owner, organization, { name: "Béta" });

  const response = await request(testApp, owner, "PATCH", parksPath(organization, second.id), {
    name: "ALFA",
  });
  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({ error: "name_taken" });
});

test("the 11th park is refused until a platform admin raises the limit", async () => {
  const { owner, organization } = await createCompany(testApp);
  for (let number = 1; number <= 10; number++) {
    await createPark(testApp, owner, organization, { name: `Park ${number}` });
  }
  const eleventh = { ...VALID_PARK, name: "Park 11" };

  const refused = await request(testApp, owner, "POST", parksPath(organization), eleventh);
  expect(refused.status).toBe(409);
  expect(await refused.json()).toEqual({ error: "park_limit_reached" });

  const raised = await request(
    testApp,
    platformAdmin,
    "PATCH",
    `/api/admin/orgs/${organization.id}`,
    { parkLimit: 11 },
  );
  expect(raised.status).toBe(200);
  expect(await raised.json()).toEqual({ parkLimit: 11 });

  const accepted = await request(testApp, owner, "POST", parksPath(organization), eleventh);
  expect(accepted.status).toBe(201);

  const limitChange = (await auditRowsOf(organization.id)).find(
    (row) => row.action === "org.park_limit.update",
  );
  expect(limitChange).toMatchObject({
    actor_user_id: platformAdmin.userId,
    target_type: "organization",
    target_id: organization.id,
    detail: { from: 10, to: 11 },
  });
});

test("two parks created at the same moment cannot both slip under the limit", async () => {
  const { owner, organization } = await createCompany(testApp);
  for (let number = 1; number <= 9; number++) {
    await createPark(testApp, owner, organization, { name: `Park ${number}` });
  }

  const simultaneous = await Promise.all(
    ["Tizedik A", "Tizedik B"].map((name) =>
      request(testApp, owner, "POST", parksPath(organization), { ...VALID_PARK, name }),
    ),
  );
  expect(simultaneous.map((response) => response.status).sort()).toEqual([201, 409]);
});

test("a platform admin sees every company with its park count and limit", async () => {
  const { owner, organization } = await createCompany(testApp);
  await createPark(testApp, owner, organization);

  const response = await request(testApp, platformAdmin, "GET", "/api/admin/orgs");
  expect(response.status).toBe(200);
  const { organizations } = await json<{ organizations: OrganizationOverview[] }>(response);
  expect(organizations.find((listed) => listed.id === organization.id)).toEqual({
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    parkCount: 1,
    parkLimit: 10,
  });
});

test("a park limit must be a whole number between 1 and 1000, for a company that exists", async () => {
  const { organization } = await createCompany(testApp);
  const path = `/api/admin/orgs/${organization.id}`;

  for (const [body, code] of [
    [{ parkLimit: 0 }, "out_of_range"],
    [{ parkLimit: 1001 }, "out_of_range"],
    [{ parkLimit: "sok" }, "invalid"],
    [{}, "required"],
  ] as const) {
    const response = await request(testApp, platformAdmin, "PATCH", path, body);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "validation", fields: { parkLimit: code } });
  }

  const unknownCompany = await request(testApp, platformAdmin, "PATCH", "/api/admin/orgs/nincs", {
    parkLimit: 20,
  });
  expect(unknownCompany.status).toBe(404);
});

test("only a platform admin can read or change park limits", async () => {
  const { owner, organization } = await createCompany(testApp);

  const read = await request(testApp, owner, "GET", "/api/admin/orgs");
  const change = await request(testApp, owner, "PATCH", `/api/admin/orgs/${organization.id}`, {
    parkLimit: 500,
  });
  for (const response of [read, change]) {
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "forbidden" });
  }
});

test("status and billingStartedAt cannot be set through the API", async () => {
  const { owner, organization } = await createCompany(testApp);
  const smuggled = { status: "online", billingStartedAt: "2026-01-01T00:00:00.000Z" };

  const created = await json<{ park: ParkBody }>(
    await request(testApp, owner, "POST", parksPath(organization), { ...VALID_PARK, ...smuggled }),
  );
  expect(created.park).toMatchObject({ status: "draft", billingStartedAt: null });

  const patched = await json<{ park: ParkBody }>(
    await request(testApp, owner, "PATCH", parksPath(organization, created.park.id), smuggled),
  );
  expect(patched.park).toMatchObject({ status: "draft", billingStartedAt: null });
});

test("every write leaves an audit row", async () => {
  const owner = await signUpVerified(testApp);
  const organization = await createOrg(testApp, owner);
  const created = await createPark(testApp, owner, organization);
  const path = parksPath(organization, created.id);

  await request(testApp, owner, "PATCH", path, { name: "Vega III." });
  await request(testApp, owner, "DELETE", path);

  const rows = await auditRowsOf(organization.id);
  expect(rows.map((row) => row.action)).toEqual(["park.create", "park.update", "park.delete"]);
  for (const row of rows) {
    expect(row).toMatchObject({
      organization_id: organization.id,
      actor_user_id: owner.userId,
      target_type: "park",
      target_id: created.id,
    });
  }
  expect(rows[1]?.detail).toEqual({ changed: ["name"] });
});
