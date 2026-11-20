import { afterAll, beforeAll, expect, test } from "bun:test";
import type { Me } from "../src/routes/me.ts";
import { signUp, signUpVerified, uniqueEmail } from "./support/accounts.ts";
import { type Actor, createTestApp, json, request, type TestApp } from "./support/app.ts";
import { linkIn, mailTo, settledMailCount } from "./support/mail.ts";
import {
  acceptInvitation,
  cancelInvitation,
  countOrganizations,
  createOrg,
  createOrgResponse,
  invite,
  inviteAndAccept,
  inviteResponse,
  leaveOrganization,
  memberRoles,
  organizationName,
  removeMember,
  renameOrgResponse,
  uniqueSlug,
  updateMemberRole,
} from "./support/organizations.ts";

let testApp: TestApp;
beforeAll(async () => {
  testApp = await createTestApp();
});
afterAll(() => testApp.close());

async function organizationsOf(app: TestApp, actor: Actor): Promise<Me["organizations"]> {
  return (await json<Me>(await request(app, actor, "GET", "/api/me"))).organizations;
}

function expectRefused(response: Response) {
  expect(response.status).toBeGreaterThanOrEqual(400);
  expect(response.status).toBeLessThan(500);
}

test("a verified user creates an organization and becomes its owner", async () => {
  const owner = await signUpVerified(testApp);
  const organization = await createOrg(testApp, owner, { name: "Vega Energia Kft." });

  expect(await organizationsOf(testApp, owner)).toEqual([
    { id: organization.id, name: "Vega Energia Kft.", slug: organization.slug, role: "owner" },
  ]);
});

test.each(["Bad Slug!", "ab", "-acme", "acme-", "a".repeat(41)])(
  "slug %p is rejected",
  async (slug) => {
    const owner = await signUpVerified(testApp);
    expectRefused(await createOrgResponse(testApp, owner, { slug }));
    expect(await countOrganizations(testApp, slug)).toBe(0);
  },
);

test("a duplicate slug is rejected", async () => {
  const firstOwner = await signUpVerified(testApp);
  const secondOwner = await signUpVerified(testApp);
  const organization = await createOrg(testApp, firstOwner);

  expectRefused(await createOrgResponse(testApp, secondOwner, { slug: organization.slug }));
  expect(await countOrganizations(testApp, organization.slug)).toBe(1);
});

test("an organization cannot be deleted through the API", async () => {
  const owner = await signUpVerified(testApp);
  const organization = await createOrg(testApp, owner);

  const response = await request(testApp, owner, "POST", "/api/auth/organization/delete", {
    organizationId: organization.id,
  });
  expectRefused(response);
  expect(await countOrganizations(testApp, organization.slug)).toBe(1);
});

test("an organization's slug cannot be changed, its name can", async () => {
  const owner = await signUpVerified(testApp);
  const organization = await createOrg(testApp, owner);
  const updatePath = "/api/auth/organization/update";

  // Every address of the company's pages contains the slug: changing it would break them all.
  for (const slug of ["Rossz Azonosító!", "egy-szabalyos-uj-azonosito"]) {
    expectRefused(
      await request(testApp, owner, "POST", updatePath, {
        organizationId: organization.id,
        data: { slug },
      }),
    );
  }
  expect(await countOrganizations(testApp, organization.slug)).toBe(1);

  const renamed = await request(testApp, owner, "POST", updatePath, {
    organizationId: organization.id,
    data: { name: "Átnevezett Kft." },
  });
  expect(renamed.status).toBe(200);
  expect((await organizationsOf(testApp, owner))[0]).toMatchObject({
    name: "Átnevezett Kft.",
    slug: organization.slug,
  });
});

const NUL = "\u0000";
const faultyCompanyNames: [description: string, name: string][] = [
  ["a name of two lines", "Két\nSor Kft."],
  ["a name with a NUL in it", `Vég${NUL}zetes Kft.`],
  ["a blank name", "   "],
  ["a name with spaces around it", " Szóközös Kft. "],
  ["a 101-character name", "x".repeat(101)],
];

test.each(faultyCompanyNames)("a company cannot be created with %s", async (_description, name) => {
  const owner = await signUpVerified(testApp);
  const slug = uniqueSlug();

  expectRefused(await createOrgResponse(testApp, owner, { name, slug }));
  expect(await countOrganizations(testApp, slug)).toBe(0);
});

test.each(faultyCompanyNames)("a company cannot be renamed to %s", async (_description, name) => {
  const owner = await signUpVerified(testApp);
  const organization = await createOrg(testApp, owner, { name: "Eredeti Név Kft." });

  expectRefused(await renameOrgResponse(testApp, owner, organization, name));
  expect(await organizationName(testApp, organization)).toBe("Eredeti Név Kft.");
});

test("a company name can be as long as 100 characters", async () => {
  const owner = await signUpVerified(testApp);
  const longestName = "x".repeat(100);
  const organization = await createOrg(testApp, owner, { name: longestName });
  expect(await organizationName(testApp, organization)).toBe(longestName);
});

test("an invited user accepts and becomes a member with the invited role", async () => {
  const owner = await signUpVerified(testApp);
  const organization = await createOrg(testApp, owner);
  const inviteeEmail = uniqueEmail();

  const invitationId = await invite(testApp, owner, organization, inviteeEmail, "member");
  const invitationMail = await mailTo(testApp, inviteeEmail, "/accept-invitation/");
  expect(linkIn(invitationMail).toString()).toBe(
    `${testApp.env.APP_URL}/accept-invitation/${invitationId}`,
  );

  const invitee = await signUpVerified(testApp, { email: inviteeEmail });
  expect((await acceptInvitation(testApp, invitee, invitationId)).status).toBe(200);
  expect(await organizationsOf(testApp, invitee)).toEqual([
    { id: organization.id, name: organization.name, slug: organization.slug, role: "member" },
  ]);
});

test("an invitation is valid for seven days", async () => {
  const owner = await signUpVerified(testApp);
  const organization = await createOrg(testApp, owner);
  const invitationId = await invite(testApp, owner, organization, uniqueEmail(), "member");

  const [invitation] = await testApp.db.$client`
    select extract(epoch from (expires_at - created_at))::int as lifetime_seconds
    from invitation where id = ${invitationId}
  `;
  const sevenDays = 7 * 24 * 60 * 60;
  expect(Math.abs(invitation.lifetime_seconds - sevenDays)).toBeLessThan(60);
});

test("an invitation cannot be accepted by a different account", async () => {
  const owner = await signUpVerified(testApp);
  const organization = await createOrg(testApp, owner);
  const invitationId = await invite(testApp, owner, organization, uniqueEmail(), "member");
  const someoneElse = await signUpVerified(testApp);

  expectRefused(await acceptInvitation(testApp, someoneElse, invitationId));
  expect(await organizationsOf(testApp, someoneElse)).toEqual([]);
});

test("a cancelled invitation cannot be accepted", async () => {
  const owner = await signUpVerified(testApp);
  const organization = await createOrg(testApp, owner);
  const inviteeEmail = uniqueEmail();
  const invitationId = await invite(testApp, owner, organization, inviteeEmail, "member");
  const invitee = await signUpVerified(testApp, { email: inviteeEmail });

  expect((await cancelInvitation(testApp, owner, invitationId)).status).toBe(200);
  expectRefused(await acceptInvitation(testApp, invitee, invitationId));
  expect(await organizationsOf(testApp, invitee)).toEqual([]);
});

test("an expired invitation cannot be accepted", async () => {
  const owner = await signUpVerified(testApp);
  const organization = await createOrg(testApp, owner);
  const inviteeEmail = uniqueEmail();
  const invitationId = await invite(testApp, owner, organization, inviteeEmail, "member");
  const invitee = await signUpVerified(testApp, { email: inviteeEmail });

  const anHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  await testApp.db
    .$client`update invitation set expires_at = ${anHourAgo} where id = ${invitationId}`;

  expectRefused(await acceptInvitation(testApp, invitee, invitationId));
  expect(await organizationsOf(testApp, invitee)).toEqual([]);
});

test("inviting the same address again withdraws the earlier invitation", async () => {
  const owner = await signUpVerified(testApp);
  const organization = await createOrg(testApp, owner);
  const inviteeEmail = uniqueEmail();

  const earlierInvitationId = await invite(testApp, owner, organization, inviteeEmail, "member");
  const laterInvitationId = await invite(testApp, owner, organization, inviteeEmail, "admin");
  expect(laterInvitationId).not.toBe(earlierInvitationId);

  const invitee = await signUpVerified(testApp, { email: inviteeEmail });
  expectRefused(await acceptInvitation(testApp, invitee, earlierInvitationId));
  expect((await acceptInvitation(testApp, invitee, laterInvitationId)).status).toBe(200);
  expect((await organizationsOf(testApp, invitee))[0]?.role).toBe("admin");
});

test("a member cannot invite", async () => {
  const owner = await signUpVerified(testApp);
  const organization = await createOrg(testApp, owner);
  const member = await inviteAndAccept(testApp, owner, organization, "member");
  const outsiderEmail = uniqueEmail();

  expectRefused(await inviteResponse(testApp, member, organization, outsiderEmail, "member"));
  expect(testApp.outbox.some((mail) => mail.to === outsiderEmail)).toBe(false);
});

test("in allowlist mode an address can sign up once it is invited", async () => {
  const adminEmail = uniqueEmail();
  const closedApp = await createTestApp({
    SIGNUP_MODE: "allowlist",
    PLATFORM_ADMIN_EMAILS: [adminEmail],
  });
  try {
    const owner = await signUpVerified(closedApp, { email: adminEmail });
    const organization = await createOrg(closedApp, owner);
    const inviteeEmail = uniqueEmail();

    // Not invited yet: the sign-up leads nowhere.
    await signUp(closedApp, { email: inviteeEmail });
    expect(await settledMailCount(closedApp, inviteeEmail)).toBe(0);

    const invitationId = await invite(closedApp, owner, organization, inviteeEmail, "member");
    const invitee = await signUpVerified(closedApp, { email: inviteeEmail });
    expect((await acceptInvitation(closedApp, invitee, invitationId)).status).toBe(200);
    expect((await organizationsOf(closedApp, invitee))[0]?.role).toBe("member");
  } finally {
    await closedApp.close();
  }
});

test("a member can change nothing about the company", async () => {
  const owner = await signUpVerified(testApp);
  const organization = await createOrg(testApp, owner, { name: "Eredeti Név Kft." });
  const member = await inviteAndAccept(testApp, owner, organization, "member");
  const colleague = await inviteAndAccept(testApp, owner, organization, "member");
  const pendingEmail = uniqueEmail();
  const pendingInvitationId = await invite(testApp, owner, organization, pendingEmail, "member");

  expectRefused(await renameOrgResponse(testApp, member, organization, "Elfoglalt Kft."));
  expectRefused(await cancelInvitation(testApp, member, pendingInvitationId));
  expectRefused(await removeMember(testApp, member, organization, colleague.email));
  expectRefused(await updateMemberRole(testApp, member, organization, colleague, "admin"));
  expectRefused(await updateMemberRole(testApp, member, organization, member, "owner"));

  expect(await organizationName(testApp, organization)).toBe("Eredeti Név Kft.");
  expect(await memberRoles(testApp, organization)).toEqual(["member", "member", "owner"]);
  // The invitation the member tried to cancel still works.
  const invitee = await signUpVerified(testApp, { email: pendingEmail });
  expect((await acceptInvitation(testApp, invitee, pendingInvitationId)).status).toBe(200);
});

test("an admin manages members but cannot make or unmake an owner", async () => {
  const owner = await signUpVerified(testApp);
  const organization = await createOrg(testApp, owner);
  const admin = await inviteAndAccept(testApp, owner, organization, "admin");
  const member = await inviteAndAccept(testApp, owner, organization, "member");

  // Within their reach: plain members.
  expect((await updateMemberRole(testApp, admin, organization, member, "admin")).status).toBe(200);
  expect((await updateMemberRole(testApp, admin, organization, member, "member")).status).toBe(200);

  // Out of their reach: the owner's role, in either direction.
  expectRefused(await updateMemberRole(testApp, admin, organization, member, "owner"));
  expectRefused(await updateMemberRole(testApp, admin, organization, admin, "owner"));
  expectRefused(await updateMemberRole(testApp, admin, organization, owner, "admin"));
  expectRefused(await removeMember(testApp, admin, organization, owner.email));
  expectRefused(
    await request(testApp, admin, "POST", "/api/auth/organization/invite-member", {
      email: uniqueEmail(),
      role: "owner",
      organizationId: organization.id,
    }),
  );

  expect(await memberRoles(testApp, organization)).toEqual(["admin", "member", "owner"]);
});

test("someone outside the company can do nothing to it", async () => {
  const owner = await signUpVerified(testApp);
  const organization = await createOrg(testApp, owner, { name: "Eredeti Név Kft." });
  const member = await inviteAndAccept(testApp, owner, organization, "member");
  const outsider = await signUpVerified(testApp);

  expectRefused(await renameOrgResponse(testApp, outsider, organization, "Elfoglalt Kft."));
  expectRefused(await inviteResponse(testApp, outsider, organization, uniqueEmail(), "admin"));
  expectRefused(await removeMember(testApp, outsider, organization, member.email));
  expectRefused(await updateMemberRole(testApp, outsider, organization, member, "admin"));

  expect(await organizationName(testApp, organization)).toBe("Eredeti Név Kft.");
  expect(await memberRoles(testApp, organization)).toEqual(["member", "owner"]);
});

test("the only owner cannot leave, be removed or be demoted", async () => {
  const owner = await signUpVerified(testApp);
  const organization = await createOrg(testApp, owner);
  const admin = await inviteAndAccept(testApp, owner, organization, "admin");

  expectRefused(await leaveOrganization(testApp, owner, organization));
  expectRefused(await removeMember(testApp, admin, organization, owner.email));
  expectRefused(await removeMember(testApp, owner, organization, owner.email));
  expectRefused(await updateMemberRole(testApp, owner, organization, owner, "member"));
  expectRefused(await updateMemberRole(testApp, admin, organization, owner, "member"));

  expect(await memberRoles(testApp, organization)).toEqual(["admin", "owner"]);
});

test("a second owner lets the first one step down", async () => {
  const owner = await signUpVerified(testApp);
  const organization = await createOrg(testApp, owner);
  const successor = await inviteAndAccept(testApp, owner, organization, "admin");

  expect((await updateMemberRole(testApp, owner, organization, successor, "owner")).status).toBe(
    200,
  );
  expect((await updateMemberRole(testApp, owner, organization, owner, "member")).status).toBe(200);
  expect(await memberRoles(testApp, organization)).toEqual(["member", "owner"]);
});
