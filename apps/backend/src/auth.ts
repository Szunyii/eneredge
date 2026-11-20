import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { users } from "@eneredge/db";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { organization } from "better-auth/plugins";
import type { AppDeps } from "./app.ts";
import type { Env } from "./env.ts";
import { type Mailer, sendInBackground } from "./mail.ts";
import { invitationMail, passwordResetMail, welcomeMail } from "./mail-templates.ts";
import { isValidOrganizationSlug } from "./organization-slug.ts";
import { maySignUp } from "./sign-up-policy.ts";
import { isDisplayName, isLocalPath } from "./text-rules.ts";

const INVITATION_LIFETIME_SECONDS = 7 * 24 * 60 * 60;
// A day: mail can be slow, and people often read it later.
const PASSWORD_LINK_LIFETIME_SECONDS = 24 * 60 * 60;

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
    // Left alone, the library skips its origin and CSRF checks when NODE_ENV is
    // "test" — and the tests would then check a system that nobody runs.
    advanced: { disableOriginCheck: false },
    // The library's endpoints that the platform does not use are switched off.
    disabledPaths: [
      // Accounts are created by our own route (routes/account.ts) …
      "/sign-up/email",
      // … and an address is confirmed by setting a password through the mailed link.
      "/send-verification-email",
      "/verify-email",
      // No screen changes a user's name or picture yet.
      "/update-user",
    ],
    emailAndPassword: {
      enabled: true,
      // An account opens when its password is set through the link sent to its
      // address (see `onPasswordReset` in createAuth). Until then nobody can sign in.
      requireEmailVerification: true,
      minPasswordLength: 10,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: PASSWORD_LINK_LIFETIME_SECONDS,
      sendResetPassword: async ({ user, url: libraryLink, token }) => {
        const isNewAccount = !user.emailVerified;
        const url = passwordPageUrl(env, {
          token,
          email: user.email,
          isNewAccount,
          nextPath: nextPathIn(libraryLink),
        });
        sendInBackground(
          mailer,
          isNewAccount
            ? welcomeMail({ to: user.email, url })
            : passwordResetMail({ to: user.email, name: user.name, url }),
        );
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
          sendInBackground(
            mailer,
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
            if (!isDisplayName(newOrganization.name)) throw invalidCompanyName();
          },
          beforeUpdateOrganization: async ({ organization: changes }) => {
            // Every address of a company's pages contains its slug; changing it would
            // break them all. Until there is a deliberate flow for that, the slug stays.
            if (changes.slug !== undefined) throw slugIsFixed();
            if (changes.name !== undefined && !isDisplayName(changes.name)) {
              throw invalidCompanyName();
            }
          },
        },
      }),
    ],
  } satisfies BetterAuthOptions;
}

/** The auth instance of a running app: the options above, stored in our database. */
export function createAuth(deps: AppDeps) {
  const options = authOptions(deps);

  return betterAuth({
    ...options,
    database: drizzleAdapter(deps.db, { provider: "pg" }),
    emailAndPassword: {
      ...options.emailAndPassword,
      // Whoever sets a password through the mailed link has shown that the
      // address is theirs. This is the only way an address gets confirmed.
      onPasswordReset: async ({ user }) => {
        await users.markEmailVerified(deps.db, user.id);
      },
    },
    databaseHooks: {
      user: {
        create: {
          // routes/account.ts asks `maySignUp` before it creates an account. The
          // same rule once more where accounts are actually written, so that no
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
 * The address of the web app's page where a password is set. The page reads
 * everything from the link: the token that proves who asks, the address to sign
 * in with afterwards, and where to go then.
 */
function passwordPageUrl(
  env: Env,
  link: { token: string; email: string; isNewAccount: boolean; nextPath: string | null },
): string {
  const url = new URL("/reset-password", env.APP_URL);
  url.searchParams.set("token", link.token);
  url.searchParams.set("email", link.email);
  if (link.isNewAccount) url.searchParams.set("welcome", "1");
  if (link.nextPath) url.searchParams.set("next", link.nextPath);
  return url.toString();
}

/**
 * Where the person was headed when the link was asked for. The library hands it
 * over inside its own link, as `callbackURL`; only a path inside the web app is kept.
 */
function nextPathIn(libraryLink: string): string | null {
  const callback = new URL(libraryLink).searchParams.get("callbackURL");
  return callback && isLocalPath(callback) ? callback : null;
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

function slugIsFixed() {
  return new APIError("BAD_REQUEST", {
    code: "SLUG_IS_FIXED",
    message: "The slug of a company cannot be changed.",
  });
}

function invalidCompanyName() {
  return new APIError("BAD_REQUEST", {
    code: "INVALID_NAME",
    message: "The name must be one line of 1-100 characters, without spaces around it.",
  });
}
