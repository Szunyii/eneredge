import { afterAll, beforeAll, expect, test } from "bun:test";
import { Hono } from "hono";
import { createAuth } from "../src/auth.ts";
import { createMemoryMailer } from "../src/mail.ts";
import { type OrgVars, requireManager, requireOrg } from "../src/middleware/org.ts";
import { requireSession } from "../src/middleware/session.ts";
import {
  type Actor,
  createOrg,
  createTestApp,
  inviteAndAccept,
  signUpVerified,
  type TestApp,
  type TestOrganization,
} from "./helpers.ts";

// A tiny app with one readable and one manager-only route under a company,
// to see the two middlewares on their own.
let testApp: TestApp;
let probe: Hono<{ Variables: OrgVars }>;
let owner: Actor;
let member: Actor;
let outsider: Actor;
let organization: TestOrganization;

beforeAll(async () => {
  testApp = await createTestApp();
  const auth = createAuth({ db: testApp.db, env: testApp.env, mailer: createMemoryMailer() });
  probe = new Hono<{ Variables: OrgVars }>()
    .use("/orgs/:orgSlug/*", requireSession(auth), requireOrg(testApp.db))
    .get("/orgs/:orgSlug/role", (context) => context.json({ role: context.get("scope").role }))
    .post("/orgs/:orgSlug/change", requireManager(), (context) => context.json({ changed: true }));

  owner = await signUpVerified(testApp);
  organization = await createOrg(testApp, owner);
  member = await inviteAndAccept(testApp, owner, organization, "member");
  outsider = await signUpVerified(testApp);
});
afterAll(() => testApp.close());

function ask(actor: Actor, method: string, path: string) {
  return probe.request(path, { method, headers: { Cookie: actor.cookie } });
}

test("a member gets through with their role", async () => {
  const response = await ask(member, "GET", `/orgs/${organization.slug}/role`);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ role: "member" });
});

test("someone outside the company gets the same 404 as for a company that does not exist", async () => {
  const foreign = await ask(outsider, "GET", `/orgs/${organization.slug}/role`);
  const unknown = await ask(outsider, "GET", "/orgs/nincs-ilyen-ceg/role");
  for (const response of [foreign, unknown]) {
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_found" });
  }
});

test("only owners and admins pass the manager check", async () => {
  const asMember = await ask(member, "POST", `/orgs/${organization.slug}/change`);
  expect(asMember.status).toBe(403);
  expect(await asMember.json()).toEqual({ error: "forbidden" });

  const asOwner = await ask(owner, "POST", `/orgs/${organization.slug}/change`);
  expect(asOwner.status).toBe(200);
});
