import { asc, eq, sql } from "drizzle-orm";
import type { Db, QueryRunner } from "../client.ts";
import { inHungarianOrder } from "../ordering.ts";
import { organization, organizationSettings, park } from "../schema/index.ts";
import { audit } from "./audit.ts";

/** What a company gets until a platform admin decides otherwise. */
export const DEFAULT_PARK_LIMIT = 10;

export type OrganizationOverview = {
  id: string;
  name: string;
  slug: string;
  parkCount: number;
  parkLimit: number;
};

/** The platform's own settings of a company. These are the platform admin's to change. */
export const orgSettings = {
  /** How many parks this company may have. */
  async parkLimitOf(runner: QueryRunner, organizationId: string): Promise<number> {
    const [settings] = await runner
      .select({ parkLimit: organizationSettings.parkLimit })
      .from(organizationSettings)
      .where(eq(organizationSettings.organizationId, organizationId))
      .limit(1);
    return settings?.parkLimit ?? DEFAULT_PARK_LIMIT;
  },

  /**
   * Sets a company's park limit and records who did it.
   * Returns false when there is no such company.
   */
  setParkLimit(
    db: Db,
    change: { organizationId: string; parkLimit: number; actorUserId: string },
  ): Promise<boolean> {
    const { organizationId, parkLimit, actorUserId } = change;

    return db.transaction(async (transaction) => {
      const [company] = await transaction
        .select({ id: organization.id })
        .from(organization)
        .where(eq(organization.id, organizationId))
        .for("update")
        .limit(1);
      if (!company) return false;

      const previousLimit = await orgSettings.parkLimitOf(transaction, organizationId);
      await transaction
        .insert(organizationSettings)
        .values({ organizationId, parkLimit })
        .onConflictDoUpdate({ target: organizationSettings.organizationId, set: { parkLimit } });
      await audit.record(transaction, {
        organizationId,
        actorUserId,
        action: "org.park_limit.update",
        targetType: "organization",
        targetId: organizationId,
        detail: { from: previousLimit, to: parkLimit },
      });
      return true;
    });
  },

  /** Every company with its number of parks and its limit, ordered by name. */
  listWithParkCounts(db: Db): Promise<OrganizationOverview[]> {
    return db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        parkCount: sql<number>`count(${park.id})::int`,
        parkLimit: sql<number>`coalesce(${organizationSettings.parkLimit}, ${DEFAULT_PARK_LIMIT})::int`,
      })
      .from(organization)
      .leftJoin(park, eq(park.organizationId, organization.id))
      .leftJoin(organizationSettings, eq(organizationSettings.organizationId, organization.id))
      .groupBy(organization.id, organizationSettings.parkLimit)
      .orderBy(inHungarianOrder(organization.name), asc(organization.slug));
  },
};
