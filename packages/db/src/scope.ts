import { and, eq } from "drizzle-orm";
import type { Db } from "./client.ts";
import { member, organization } from "./schema/index.ts";

export type OrgRole = "owner" | "admin" | "member";

declare const orgScopeBrand: unique symbol;

/**
 * Proof that a user belongs to a company, and in which role. Every query on a
 * company's data takes one, and only `resolveOrgScope` can make one — so no query
 * can run for a company whose membership was not checked first.
 */
export type OrgScope = {
  readonly organizationId: string;
  readonly organizationSlug: string;
  readonly userId: string;
  readonly role: OrgRole;
  readonly [orgScopeBrand]: true;
};

/**
 * Looks the membership up in the database, every time: a member who was removed
 * a moment ago gets `null` on their very next request.
 */
export async function resolveOrgScope(
  db: Db,
  input: { userId: string; orgSlug: string },
): Promise<OrgScope | null> {
  const [membership] = await db
    .select({
      organizationId: organization.id,
      organizationSlug: organization.slug,
      storedRoles: member.role,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(and(eq(member.userId, input.userId), eq(organization.slug, input.orgSlug)))
    .limit(1);
  if (!membership) return null;

  // The only place an OrgScope is made: the cast adds the brand that nothing else can.
  return {
    organizationId: membership.organizationId,
    organizationSlug: membership.organizationSlug,
    userId: input.userId,
    role: strongestRole(membership.storedRoles),
  } as OrgScope;
}

/** Owners and admins may change a company's data; members only read it. */
export function canManage(scope: OrgScope): boolean {
  return scope.role === "owner" || scope.role === "admin";
}

const ROLES_BY_STRENGTH: readonly OrgRole[] = ["owner", "admin", "member"];

/**
 * The auth library stores several roles as "admin,member"; the strongest one
 * counts. A role this platform does not know is a plain member.
 */
export function strongestRole(storedRoles: string): OrgRole {
  const held = storedRoles.split(",").map((role) => role.trim());
  return ROLES_BY_STRENGTH.find((role) => held.includes(role)) ?? "member";
}
