import { orgSettings, signupAllowlist } from "@eneredge/db";
import { Hono } from "hono";
import { z } from "zod";
import type { AppDeps } from "../app.ts";
import type { Auth } from "../auth.ts";
import { apiError } from "../errors.ts";
import { requirePlatformAdmin, requireSession, type SessionVars } from "../middleware/session.ts";
import { validateJsonBody } from "../validation.ts";

const allowlistEntrySchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
});

const parkLimitSchema = z.object({
  parkLimit: z.number().int().min(1).max(1000),
});

/** /api/admin/* — what only platform admins may do. */
export function adminRoutes(deps: AppDeps, auth: Auth) {
  return (
    new Hono<{ Variables: SessionVars }>()
      .use(requireSession(auth), requirePlatformAdmin(deps.env))

      // The addresses that may sign up while registration is by invitation only.
      .get("/signup-allowlist", async (context) => {
        const entries = await signupAllowlist.list(deps.db);
        return context.json(
          {
            emails: entries.map((entry) => ({
              email: entry.email,
              createdAt: entry.createdAt.toISOString(),
            })),
          },
          200,
        );
      })

      .post("/signup-allowlist", async (context) => {
        const body = await validateJsonBody(context, allowlistEntrySchema);
        if (!body.ok) return body.response;

        await signupAllowlist.add(deps.db, {
          email: body.value.email,
          addedBy: context.get("user").id,
        });
        return context.json({ email: body.value.email }, 201);
      })

      .delete("/signup-allowlist/:email", async (context) => {
        const wasListed = await signupAllowlist.remove(deps.db, context.req.param("email"));
        if (!wasListed) return apiError(context, 404, "not_found");
        return context.body(null, 204);
      })

      // Every company, with how many parks it has and how many it may have.
      .get("/orgs", async (context) => {
        const organizations = await orgSettings.listWithParkCounts(deps.db);
        return context.json({ organizations }, 200);
      })

      .patch("/orgs/:orgId", async (context) => {
        const body = await validateJsonBody(context, parkLimitSchema);
        if (!body.ok) return body.response;

        const companyExists = await orgSettings.setParkLimit(deps.db, {
          organizationId: context.req.param("orgId"),
          parkLimit: body.value.parkLimit,
          actorUserId: context.get("user").id,
        });
        if (!companyExists) return apiError(context, 404, "not_found");
        return context.json({ parkLimit: body.value.parkLimit }, 200);
      })
  );
}
