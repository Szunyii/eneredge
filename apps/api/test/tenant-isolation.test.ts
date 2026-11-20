import { afterAll, beforeAll, expect, test } from "bun:test";
import { type OrgScope, parks, resolveOrgScope } from "@eneredge/db";
import {
  type Actor,
  createCompany,
  createPark,
  createTestApp,
  inviteAndAccept,
  json,
  type ParkBody,
  parksPath,
  removeMember,
  request,
  type TestApp,
  type TestOrganization,
  VALID_PARK,
} from "./helpers.ts";

// Two companies that know nothing of each other.
let testApp: TestApp;
let acme: TestOrganization;
let acmeOwner: Actor;
let acmeMember: Actor;
let acmePark: ParkBody;
let acmeScope: OrgScope;
let borealis: TestOrganization;
let borealisOwner: Actor;
let borealisPark: ParkBody;
let borealisScope: OrgScope;

async function scopeOf(actor: Actor, organization: TestOrganization): Promise<OrgScope> {
  const scope = await resolveOrgScope(testApp.db, {
    userId: actor.userId,
    orgSlug: organization.slug,
  });
  if (!scope) throw new Error(`${actor.email} is not a member of ${organization.slug}`);
  return scope;
}

beforeAll(async () => {
  testApp = await createTestApp();

  ({ owner: acmeOwner, organization: acme } = await createCompany(testApp));
  acmeMember = await inviteAndAccept(testApp, acmeOwner, acme, "member");
  acmePark = await createPark(testApp, acmeOwner, acme, { name: "Acme park" });
  acmeScope = await scopeOf(acmeOwner, acme);

  ({ owner: borealisOwner, organization: borealis } = await createCompany(testApp));
  borealisPark = await createPark(testApp, borealisOwner, borealis, { name: "Borealis park" });
  borealisScope = await scopeOf(borealisOwner, borealis);
});
afterAll(() => testApp.close());

function expectNotFound(response: Response) {
  expect(response.status).toBe(404);
  return expect(response.json()).resolves.toEqual({ error: "not_found" });
}

test("unauthenticated requests are 401", async () => {
  for (const [method, path, body] of [
    ["GET", parksPath(acme), undefined],
    ["POST", parksPath(acme), VALID_PARK],
    ["GET", parksPath(acme, acmePark.id), undefined],
    ["PATCH", parksPath(acme, acmePark.id), { name: "x" }],
    ["DELETE", parksPath(acme, acmePark.id), undefined],
  ] as const) {
    const response = await request(testApp, null, method, path, body);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthenticated" });
  }
});

test("a user cannot list, read, change or delete another organization's parks", async () => {
  for (const [method, path, body] of [
    // Straight at the other company:
    ["GET", parksPath(borealis), undefined],
    ["POST", parksPath(borealis), VALID_PARK],
    ["GET", parksPath(borealis, borealisPark.id), undefined],
    // The other company's park through their own company's address:
    ["GET", parksPath(acme, borealisPark.id), undefined],
    ["PATCH", parksPath(acme, borealisPark.id), { name: "x" }],
    ["DELETE", parksPath(acme, borealisPark.id), undefined],
  ] as const) {
    await expectNotFound(await request(testApp, acmeOwner, method, path, body));
  }

  const untouched = await parks.get(testApp.db, borealisScope, borealisPark.id);
  expect(untouched?.name).toBe(borealisPark.name);
  expect(await parks.list(testApp.db, borealisScope)).toHaveLength(1);
});

test("a list never contains another organization's park", async () => {
  const acmeList = await json<{ parks: ParkBody[] }>(
    await request(testApp, acmeOwner, "GET", parksPath(acme)),
  );
  const borealisList = await json<{ parks: ParkBody[] }>(
    await request(testApp, borealisOwner, "GET", parksPath(borealis)),
  );
  expect(acmeList.parks.map((park) => park.id)).toEqual([acmePark.id]);
  expect(borealisList.parks.map((park) => park.id)).toEqual([borealisPark.id]);
});

test("a member can read but not write", async () => {
  expect((await request(testApp, acmeMember, "GET", parksPath(acme))).status).toBe(200);
  expect((await request(testApp, acmeMember, "GET", parksPath(acme, acmePark.id))).status).toBe(
    200,
  );

  for (const [method, path, body] of [
    ["POST", parksPath(acme), { ...VALID_PARK, name: "A tag parkja" }],
    ["PATCH", parksPath(acme, acmePark.id), { name: "Átnevezve" }],
    ["DELETE", parksPath(acme, acmePark.id), undefined],
  ] as const) {
    const response = await request(testApp, acmeMember, method, path, body);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "forbidden" });
  }
  expect((await parks.get(testApp.db, acmeScope, acmePark.id))?.name).toBe(acmePark.name);
});

test("a removed member loses access on the next request", async () => {
  const leavingMember = await inviteAndAccept(testApp, acmeOwner, acme, "member");
  expect((await request(testApp, leavingMember, "GET", parksPath(acme))).status).toBe(200);

  expect((await removeMember(testApp, acmeOwner, acme, leavingMember.email)).status).toBe(200);

  await expectNotFound(await request(testApp, leavingMember, "GET", parksPath(acme)));
  await expectNotFound(await request(testApp, leavingMember, "GET", parksPath(acme, acmePark.id)));
});

test("the repository refuses a foreign id even when called directly", async () => {
  expect(await parks.get(testApp.db, acmeScope, borealisPark.id)).toBeNull();
  expect(await parks.update(testApp.db, acmeScope, borealisPark.id, { name: "x" })).toBeNull();
  expect(await parks.remove(testApp.db, acmeScope, borealisPark.id)).toBe(false);

  expect((await parks.get(testApp.db, borealisScope, borealisPark.id))?.name).toBe(
    borealisPark.name,
  );
});

test("a park id that is not a UUID is a 404", async () => {
  for (const [method, body] of [
    ["GET", undefined],
    ["PATCH", { name: "x" }],
    ["DELETE", undefined],
  ] as const) {
    await expectNotFound(
      await request(testApp, acmeOwner, method, parksPath(acme, "not-a-uuid"), body),
    );
  }
});
