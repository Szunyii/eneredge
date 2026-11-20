import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { type Db, invitations, signupAllowlist } from "@eneredge/db";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { organization } from "better-auth/plugins";
import type { AppDeps } from "./app.ts";
import type { Env } from "./env.ts";
import type { Mailer } from "./mail.ts";
import { invitationMail, passwordResetMail, verificationMail } from "./mail-templates.ts";
import { isValidOrganizationSlug } from "./organization-slug.ts";

const INVITATION_LIFETIME_SECONDS = 7 * 24 * 60 * 60;

/**
 * Everything about sign-in that does not need a database: how accounts work and
 * which mails go out. The schema generator (auth.cli.ts) reads these options too.
 */
export function authOptions(deps: { env: Env; mailer: Mailer }) {
  const { env, mailer } = deps;

  return {
    appName: "EnerEdge",
    baseURL: env.APP_URL,
    secret: env.AUTH_SECRET,
    trustedOrigins: [env.APP_URL],
    emailAndPassword: {
      enabled: true,
      // No session before the address is confirmed.
      requireEmailVerification: true,
      minPasswordLength: 10,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, token }) => {
        // The link opens the web app's own page, which then posts the new password.
        const url = `${env.APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
        // Not awaited: the response time must not tell whether the address has an account.
        void mailer.send(passwordResetMail({ to: user.email, name: user.name, url }));
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        void mailer.send(verificationMail({ to: user.email, name: user.name, url }));
      },
    },
    plugins: [
      organization({
        creatorRole: "owner",
        invitationExpiresIn: INVITATION_LIFETIME_SECONDS,
        // Inviting an address again replaces the invitation it already holds.
        cancelPendingInvitationsOnReInvite: true,
        requireEmailVerificationOnInvitation: true,
        // Deleting a company would take its parks with it. Until there is a
        // deliberate flow for that, nobody can do it through the API.
        disableOrganizationDeletion: true,
        sendInvitationEmail: async (invitation) => {
          void mailer.send(
            invitationMail({
              to: invitation.email,
              inviterName: invitation.inviter.user.name,
              organizationName: invitation.organization.name,
              url: `${env.APP_URL}/accept-invitation/${invitation.id}`,
            }),
          );
        },
        organizationHooks: {
          beforeCreateOrganization: async ({ organization: newOrganization }) => {
            if (!isValidOrganizationSlug(newOrganization.slug ?? "")) throw invalidSlug();
          },
          beforeUpdateOrganization: async ({ organization: changes }) => {
            if (changes.slug !== undefined && !isValidOrganizationSlug(changes.slug)) {
              throw invalidSlug();
            }
          },
        },
      }),
    ],
  } satisfies BetterAuthOptions;
}

/** The auth instance of a running app: the options above, stored in our database. */
export function createAuth(deps: AppDeps) {
  return betterAuth({
    ...authOptions(deps),
    database: drizzleAdapter(deps.db, { provider: "pg" }),
    hooks: {
      // Sign-up by invitation only: refuse before anything happens, with a code the
      // sign-up page can explain. (That sign-up is closed is no secret.)
      before: createAuthMiddleware(async (context) => {
        if (context.path !== "/sign-up/email") return;
        const email: unknown = context.body?.email;
        if (typeof email === "string" && !(await maySignUp(deps.db, deps.env, email))) {
          throw signUpClosed();
        }
      }),
    },
    databaseHooks: {
      user: {
        create: {
          // The same rule once more where accounts are actually created, so that no
          // other endpoint, now or later, can get around the allowlist.
          before: async (user) => {
            if (!(await maySignUp(deps.db, deps.env, user.email))) throw signUpClosed();
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

/**
 * In `allowlist` mode only three kinds of address may create an account:
 * allowlisted ones, ones holding a pending invitation, and platform admins.
 */
async function maySignUp(db: Db, env: Env, email: string): Promise<boolean> {
  if (env.SIGNUP_MODE === "open") return true;

  const address = email.trim().toLowerCase();
  if (env.PLATFORM_ADMIN_EMAILS.includes(address)) return true;
  if (await signupAllowlist.has(db, address)) return true;
  return invitations.hasPendingFor(db, address);
}

function signUpClosed() {
  return new APIError("FORBIDDEN", {
    code: "SIGNUP_CLOSED",
    message: "Sign-up is by invitation only.",
  });
}

function invalidSlug() {
  return new APIError("BAD_REQUEST", {
    code: "INVALID_SLUG",
    message: "The slug must be 3-40 lower-case letters, digits and single hyphens.",
  });
}
