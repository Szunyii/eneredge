import { randomUUID } from "node:crypto";
import { signUpVerified, uniqueEmail } from "./accounts.ts";
import { type Actor, json, request, type TestApp } from "./app.ts";
import { linkIn, mailTo } from "./mail.ts";

// Companies, members and invitations: the auth library's organization endpoints.

export type TestOrganization = { id: string; slug: string; name: string };

export function uniqueSlug(): string {
  return `ceg-${randomUUID().slice(0, 12)}`;
}

/** The raw answer to creating a company — for the cases that must be refused. */
export function createOrgResponse(
  testApp: TestApp,
  owner: Actor,
  input: { name?: string; slug?: string } = {},
): Promise<Response> {
  return request(testApp, owner, "POST", "/api/auth/organization/create", {
    name: input.name ?? "Teszt Erőmű Kft.",
    slug: input.slug ?? uniqueSlug(),
  });
}

export async function createOrg(
  testApp: TestApp,
  owner: Actor,
  input: { name?: string; slug?: string } = {},
): Promise<TestOrganization> {
  const response = await createOrgResponse(testApp, owner, input);
  if (response.status !== 200) {
    throw new Error(`Creating the company failed: ${response.status} ${await response.text()}`);
  }
  const { id, slug, name } = await json<TestOrganization>(response);
  return { id, slug, name };
}

export function renameOrgResponse(
  testApp: TestApp,
  renamer: Actor,
  organization: { id: string },
  name: string,
): Promise<Response> {
  return request(testApp, renamer, "POST", "/api/auth/organization/update", {
    organizationId: organization.id,
    data: { name },
  });
}

/** The name of a company, as stored. */
export async function organizationName(
  testApp: TestApp,
  organization: { id: string },
): Promise<string> {
  const [stored] = await testApp.db
    .$client`select name from organization where id = ${organization.id}`;
  return stored.name;
}

export function inviteResponse(
  testApp: TestApp,
  inviter: Actor,
  organization: { id: string },
  email: string,
  role: "admin" | "member",
): Promise<Response> {
  return request(testApp, inviter, "POST", "/api/auth/organization/invite-member", {
    email,
    role,
    organizationId: organization.id,
  });
}

/** Invites an address and returns the invitation's id, read from the link in the mail. */
export async function invite(
  testApp: TestApp,
  inviter: Actor,
  organization: { id: string },
  email: string,
  role: "admin" | "member",
): Promise<string> {
  const response = await inviteResponse(testApp, inviter, organization, email, role);
  if (response.status !== 200) {
    throw new Error(`Inviting ${email} failed: ${response.status} ${await response.text()}`);
  }
  const invitationLink = linkIn(await mailTo(testApp, email, "/accept-invitation/"));
  const invitationId = invitationLink.pathname.split("/").pop();
  if (!invitationId) throw new Error("The invitation mail has no invitation id in its link");
  return invitationId;
}

export function acceptInvitation(
  testApp: TestApp,
  invitee: Actor,
  invitationId: string,
): Promise<Response> {
  return request(testApp, invitee, "POST", "/api/auth/organization/accept-invitation", {
    invitationId,
  });
}

export function cancelInvitation(
  testApp: TestApp,
  canceller: Actor,
  invitationId: string,
): Promise<Response> {
  return request(testApp, canceller, "POST", "/api/auth/organization/cancel-invitation", {
    invitationId,
  });
}

/** Invites a brand-new user, signs them up and accepts: the result is a member of the company. */
export async function inviteAndAccept(
  testApp: TestApp,
  owner: Actor,
  organization: { id: string },
  role: "admin" | "member",
): Promise<Actor> {
  const email = uniqueEmail();
  const invitationId = await invite(testApp, owner, organization, email, role);
  const newMember = await signUpVerified(testApp, { email });
  const accepted = await acceptInvitation(testApp, newMember, invitationId);
  if (accepted.status !== 200) {
    throw new Error(`Accepting failed: ${accepted.status} ${await accepted.text()}`);
  }
  return newMember;
}

export function removeMember(
  testApp: TestApp,
  remover: Actor,
  organization: { id: string },
  memberEmail: string,
): Promise<Response> {
  return request(testApp, remover, "POST", "/api/auth/organization/remove-member", {
    memberIdOrEmail: memberEmail,
    organizationId: organization.id,
  });
}

export async function updateMemberRole(
  testApp: TestApp,
  changer: Actor,
  organization: { id: string },
  member: Actor,
  role: "owner" | "admin" | "member",
): Promise<Response> {
  const [membership] = await testApp.db.$client`
    select id from member where user_id = ${member.userId} and organization_id = ${organization.id}
  `;
  return request(testApp, changer, "POST", "/api/auth/organization/update-member-role", {
    memberId: membership.id,
    role,
    organizationId: organization.id,
  });
}

export function leaveOrganization(
  testApp: TestApp,
  leaver: Actor,
  organization: { id: string },
): Promise<Response> {
  return request(testApp, leaver, "POST", "/api/auth/organization/leave", {
    organizationId: organization.id,
  });
}

/** The roles of a company's members, as stored. */
export async function memberRoles(
  testApp: TestApp,
  organization: { id: string },
): Promise<string[]> {
  const memberships = await testApp.db.$client`
    select role from member where organization_id = ${organization.id} order by role
  `;
  return memberships.map((membership: { role: string }) => membership.role);
}

export async function countOrganizations(testApp: TestApp, slug: string): Promise<number> {
  const [result] = await testApp.db
    .$client`select count(*)::int as count from organization where slug = ${slug}`;
  return result.count;
}

/** A new owner with a new company: tests that need a clean slate start here. */
export async function createCompany(
  testApp: TestApp,
): Promise<{ owner: Actor; organization: TestOrganization }> {
  const owner = await signUpVerified(testApp);
  const organization = await createOrg(testApp, owner);
  return { owner, organization };
}
