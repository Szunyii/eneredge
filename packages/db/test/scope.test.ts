import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { canManage, resolveOrgScope } from "../src/index.ts";
import { member, organization, user } from "../src/schema/index.ts";
import { createTestDatabase, type TestDatabase } from "../src/testing.ts";

let database: TestDatabase;
beforeAll(async () => {
  database = await createTestDatabase();
});
afterAll(() => database.close());

async function insertUser(): Promise<string> {
  const id = randomUUID();
  const now = new Date();
  await database.db.insert(user).values({
    id,
    name: "Teszt Elek",
    email: `${id}@example.test`,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

async function insertOrganization(): Promise<{ id: string; slug: string }> {
  const id = randomUUID();
  const slug = `ceg-${id.slice(0, 12)}`;
  await database.db
    .insert(organization)
    .values({ id, name: "Teszt Erőmű Kft.", slug, createdAt: new Date() });
  return { id, slug };
}

async function insertMembership(userId: string, organizationId: string, role: string) {
  await database.db
    .insert(member)
    .values({ id: randomUUID(), userId, organizationId, role, createdAt: new Date() });
}

test("resolveOrgScope describes the membership of a member", async () => {
  const userId = await insertUser();
  const company = await insertOrganization();
  await insertMembership(userId, company.id, "owner");

  const scope = await resolveOrgScope(database.db, { userId, orgSlug: company.slug });
  expect(scope).toMatchObject({
    organizationId: company.id,
    organizationSlug: company.slug,
    userId,
    role: "owner",
  });
});

test("resolveOrgScope returns null for a non-member and for an unknown slug", async () => {
  const outsiderId = await insertUser();
  const company = await insertOrganization();

  expect(
    await resolveOrgScope(database.db, { userId: outsiderId, orgSlug: company.slug }),
  ).toBeNull();
  expect(
    await resolveOrgScope(database.db, { userId: outsiderId, orgSlug: "nincs-ilyen-ceg" }),
  ).toBeNull();
});

test("resolveOrgScope returns the highest role", async () => {
  const userId = await insertUser();
  const company = await insertOrganization();
  await insertMembership(userId, company.id, "member,admin");

  const scope = await resolveOrgScope(database.db, { userId, orgSlug: company.slug });
  expect(scope?.role).toBe("admin");
});

test("an unknown role counts as a plain member", async () => {
  const userId = await insertUser();
  const company = await insertOrganization();
  await insertMembership(userId, company.id, "auditor");

  const scope = await resolveOrgScope(database.db, { userId, orgSlug: company.slug });
  expect(scope?.role).toBe("member");
});

test("owners and admins can manage, members cannot", async () => {
  const company = await insertOrganization();
  const canManageByRole: Record<string, boolean> = {};
  for (const role of ["owner", "admin", "member"]) {
    const userId = await insertUser();
    await insertMembership(userId, company.id, role);
    const scope = await resolveOrgScope(database.db, { userId, orgSlug: company.slug });
    if (!scope) throw new Error(`No scope for the ${role}`);
    canManageByRole[role] = canManage(scope);
  }
  expect(canManageByRole).toEqual({ owner: true, admin: true, member: false });
});
