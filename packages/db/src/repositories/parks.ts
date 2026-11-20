import { and, asc, eq, ne, sql } from "drizzle-orm";
import type { Db, Transaction } from "../client.ts";
import { inHungarianOrder } from "../ordering.ts";
import { organization, park } from "../schema/index.ts";
import type { OrgScope } from "../scope.ts";
import { isUuid } from "../uuid.ts";
import { audit } from "./audit.ts";
import { orgSettings } from "./org-settings.ts";

export type Park = typeof park.$inferSelect;

/** What a manager can say about a park. Status and billing are the platform's to set. */
export type ParkInput = {
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  fastIntervalS?: number;
};

export class ParkNameTakenError extends Error {
  override name = "ParkNameTakenError";
  constructor() {
    super("The company already has a park with this name.");
  }
}

export class ParkLimitReachedError extends Error {
  override name = "ParkLimitReachedError";
  constructor() {
    super("The company has reached its park limit.");
  }
}

/**
 * The parks of one company. Every function takes the caller's OrgScope and looks
 * only at that company's rows: another company's park is simply not there.
 * Every change writes its audit row in the same transaction.
 */
export const parks = {
  /** The company's parks, in alphabetical order. */
  list(db: Db, scope: OrgScope): Promise<Park[]> {
    return db
      .select()
      .from(park)
      .where(ofOrganization(scope))
      .orderBy(inHungarianOrder(park.name), asc(park.id));
  },

  async get(db: Db, scope: OrgScope, parkId: string): Promise<Park | null> {
    if (!isUuid(parkId)) return null;
    const [found] = await db.select().from(park).where(thisPark(scope, parkId)).limit(1);
    return found ?? null;
  },

  /** Throws ParkLimitReachedError or ParkNameTakenError when the park cannot be added. */
  create(db: Db, scope: OrgScope, input: ParkInput): Promise<Park> {
    return db.transaction(async (transaction) => {
      await lockOrganization(transaction, scope);

      const parkCount = await transaction.$count(park, ofOrganization(scope));
      const parkLimit = await orgSettings.parkLimitOf(transaction, scope.organizationId);
      if (parkCount >= parkLimit) throw new ParkLimitReachedError();
      if (await nameIsTaken(transaction, scope, input.name)) throw new ParkNameTakenError();

      const [created] = await transaction
        .insert(park)
        .values({ ...input, organizationId: scope.organizationId, createdBy: scope.userId })
        .returning();
      if (!created) throw new Error("The park was not inserted.");

      await recordParkChange(transaction, scope, "park.create", created.id, {
        name: created.name,
      });
      return created;
    });
  },

  /**
   * Changes the given fields. Returns null when the company has no such park, and
   * the park untouched when nothing would change. Throws ParkNameTakenError.
   */
  update(db: Db, scope: OrgScope, parkId: string, patch: Partial<ParkInput>): Promise<Park | null> {
    if (!isUuid(parkId)) return Promise.resolve(null);

    return db.transaction(async (transaction) => {
      await lockOrganization(transaction, scope);

      const [current] = await transaction.select().from(park).where(thisPark(scope, parkId));
      if (!current) return null;

      const changes = changesTo(current, patch);
      const changedFields = Object.keys(changes);
      if (changedFields.length === 0) return current;

      if (
        changes.name !== undefined &&
        (await nameIsTaken(transaction, scope, changes.name, parkId))
      ) {
        throw new ParkNameTakenError();
      }

      const [updated] = await transaction
        .update(park)
        .set({ ...changes, updatedAt: sql`now()` })
        .where(thisPark(scope, parkId))
        .returning();
      if (!updated) return null;

      await recordParkChange(transaction, scope, "park.update", parkId, {
        changed: changedFields,
      });
      return updated;
    });
  },

  /** Returns whether the company had such a park. */
  remove(db: Db, scope: OrgScope, parkId: string): Promise<boolean> {
    if (!isUuid(parkId)) return Promise.resolve(false);

    return db.transaction(async (transaction) => {
      const [removed] = await transaction
        .delete(park)
        .where(thisPark(scope, parkId))
        .returning({ name: park.name });
      if (!removed) return false;

      await recordParkChange(transaction, scope, "park.delete", parkId, { name: removed.name });
      return true;
    });
  },
};

/** The condition every park query carries: the row belongs to the caller's company. */
function ofOrganization(scope: OrgScope) {
  return eq(park.organizationId, scope.organizationId);
}

function thisPark(scope: OrgScope, parkId: string) {
  return and(ofOrganization(scope), eq(park.id, parkId));
}

/**
 * Makes the company's park changes wait for each other, so that counting the
 * parks or checking a name and then writing cannot be overtaken by another request.
 */
async function lockOrganization(transaction: Transaction, scope: OrgScope): Promise<void> {
  await transaction
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.id, scope.organizationId))
    .for("update");
}

async function nameIsTaken(
  transaction: Transaction,
  scope: OrgScope,
  name: string,
  exceptParkId?: string,
): Promise<boolean> {
  const sameName = and(ofOrganization(scope), eq(sql`lower(${park.name})`, sql`lower(${name})`));
  const [taken] = await transaction
    .select({ id: park.id })
    .from(park)
    .where(exceptParkId ? and(sameName, ne(park.id, exceptParkId)) : sameName)
    .limit(1);
  return taken !== undefined;
}

/** The fields of the patch whose value differs from the park's current one. */
function changesTo(current: Park, patch: Partial<ParkInput>): Partial<ParkInput> {
  const changes: Partial<ParkInput> = {};
  if (patch.name !== undefined && patch.name !== current.name) changes.name = patch.name;
  if (patch.latitude !== undefined && patch.latitude !== current.latitude) {
    changes.latitude = patch.latitude;
  }
  if (patch.longitude !== undefined && patch.longitude !== current.longitude) {
    changes.longitude = patch.longitude;
  }
  if (patch.timezone !== undefined && patch.timezone !== current.timezone) {
    changes.timezone = patch.timezone;
  }
  if (patch.fastIntervalS !== undefined && patch.fastIntervalS !== current.fastIntervalS) {
    changes.fastIntervalS = patch.fastIntervalS;
  }
  return changes;
}

function recordParkChange(
  transaction: Transaction,
  scope: OrgScope,
  action: "park.create" | "park.update" | "park.delete",
  parkId: string,
  detail: Record<string, unknown>,
): Promise<void> {
  return audit.record(transaction, {
    organizationId: scope.organizationId,
    actorUserId: scope.userId,
    action,
    targetType: "park",
    targetId: parkId,
    detail,
  });
}
