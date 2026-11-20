import { asc, eq, sql } from "drizzle-orm";
import type { Db } from "../client.ts";
import { member, organization } from "../schema/index.ts";
import { type OrgRole, strongestRole } from "../scope.ts";

export type Membership = { organizationId: string; name: string; slug: string; role: OrgRole };

/** Which companies a user belongs to. Members are added and removed by the auth library. */
export const memberships = {
  /** The user's companies, ordered by name. */
  async listForUser(db: Db, userId: string): Promise<Membership[]> {
    const found = await db
      .select({
        organizationId: organization.id,
        name: organization.name,
        slug: organization.slug,
        storedRoles: member.role,
      })
      .from(member)
      .innerJoin(organization, eq(member.organizationId, organization.id))
      .where(eq(member.userId, userId))
      .orderBy(asc(sql`lower(${organization.name})`), asc(organization.slug));

    return found.map(({ storedRoles, ...company }) => ({
      ...company,
      role: strongestRole(storedRoles),
    }));
  },
};
