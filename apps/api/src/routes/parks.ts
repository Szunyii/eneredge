import { type Park, ParkLimitReachedError, ParkNameTakenError, parks } from "@eneredge/db";
import { type Context, Hono } from "hono";
import { z } from "zod";
import type { AppDeps } from "../app.ts";
import type { Auth } from "../auth.ts";
import { apiError } from "../errors.ts";
import { type OrgVars, requireManager, requireOrg } from "../middleware/org.ts";
import { requireSession } from "../middleware/session.ts";
import { jsonBody } from "../validation.ts";

/** A park as the API shows it. */
export type ParkDto = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  status: Park["status"];
  fastIntervalS: number;
  billingStartedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

// What a manager may send. Anything else in the body — status, billingStartedAt — is dropped.
const parkInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().trim().min(1).refine(isTimeZone),
  fastIntervalS: z.number().int().min(5).max(3600).optional(),
});

const parkPatchSchema = parkInputSchema.partial();

/**
 * /api/orgs/:orgSlug/parks — the parks of one company. Members read; owners and
 * admins also write. Someone outside the company gets 404 for everything here.
 */
export function parkRoutes(deps: AppDeps, auth: Auth) {
  const { db } = deps;

  return new Hono<{ Variables: OrgVars }>()
    .use(requireSession(auth), requireOrg(db))

    .get("/", async (context) => {
      const found = await parks.list(db, context.get("scope"));
      return context.json({ parks: found.map(toParkDto) }, 200);
    })

    .post("/", requireManager(), jsonBody(parkInputSchema), async (context) => {
      try {
        const created = await parks.create(db, context.get("scope"), context.req.valid("json"));
        return context.json({ park: toParkDto(created) }, 201);
      } catch (error) {
        return conflictResponse(context, error);
      }
    })

    .get("/:parkId", async (context) => {
      const found = await parks.get(db, context.get("scope"), context.req.param("parkId"));
      if (!found) return apiError(context, 404, "not_found");
      return context.json({ park: toParkDto(found) }, 200);
    })

    .patch("/:parkId", requireManager(), jsonBody(parkPatchSchema), async (context) => {
      try {
        const parkId = context.req.param("parkId");
        const changes = context.req.valid("json");
        const updated = await parks.update(db, context.get("scope"), parkId, changes);
        if (!updated) return apiError(context, 404, "not_found");
        return context.json({ park: toParkDto(updated) }, 200);
      } catch (error) {
        return conflictResponse(context, error);
      }
    })

    .delete("/:parkId", requireManager(), async (context) => {
      const removed = await parks.remove(db, context.get("scope"), context.req.param("parkId"));
      if (!removed) return apiError(context, 404, "not_found");
      return context.body(null, 204);
    });
}

function toParkDto(park: Park): ParkDto {
  return {
    id: park.id,
    name: park.name,
    latitude: park.latitude,
    longitude: park.longitude,
    timezone: park.timezone,
    status: park.status,
    fastIntervalS: park.fastIntervalS,
    billingStartedAt: park.billingStartedAt?.toISOString() ?? null,
    createdAt: park.createdAt.toISOString(),
    updatedAt: park.updatedAt.toISOString(),
  };
}

/** The two refusals a park change can run into; anything else is not ours to answer. */
function conflictResponse(context: Context, error: unknown) {
  if (error instanceof ParkNameTakenError) return apiError(context, 409, "name_taken");
  if (error instanceof ParkLimitReachedError) return apiError(context, 409, "park_limit_reached");
  throw error;
}

/** Whether the runtime knows this IANA time zone name. */
function isTimeZone(name: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: name });
    return true;
  } catch {
    return false;
  }
}
