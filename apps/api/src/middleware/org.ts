import { canManage, type Db, type OrgScope, resolveOrgScope } from "@eneredge/db";
import type { MiddlewareHandler } from "hono";
import { apiError } from "../errors.ts";
import { isValidOrganizationSlug } from "../organization-slug.ts";
import type { SessionVars } from "./session.ts";

export type OrgVars = SessionVars & { scope: OrgScope };

/**
 * For routes with `:orgSlug` in their path, behind `requireSession`. Checks the
 * membership in the database on every request and makes the scope available.
 * A company the user does not belong to looks exactly like one that does not exist: 404.
 */
export function requireOrg(db: Db): MiddlewareHandler<{ Variables: OrgVars }> {
  return async (context, next) => {
    const orgSlug = context.req.param("orgSlug");
    // A slug that no company could have needs no query — and must not reach one.
    const scope =
      orgSlug && isValidOrganizationSlug(orgSlug)
        ? await resolveOrgScope(db, { userId: context.get("user").id, orgSlug })
        : null;
    if (!scope) return apiError(context, 404, "not_found");

    context.set("scope", scope);
    await next();
  };
}

/** For routes behind `requireOrg` that change something: members only read. */
export function requireManager(): MiddlewareHandler<{ Variables: OrgVars }> {
  return async (context, next) => {
    if (!canManage(context.get("scope"))) return apiError(context, 403, "forbidden");
    await next();
  };
}
