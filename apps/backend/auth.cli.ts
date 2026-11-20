// Read by the Better Auth CLI only, to generate packages/db/src/schema/auth.ts:
//
//   bunx auth@1.7.26 generate --config auth.cli.ts --adapter drizzle --dialect postgresql \
//     --output ../../packages/db/src/schema/auth.ts --yes
//
// It needs the options (which plugins, which fields), not a database or real settings.
import { betterAuth } from "better-auth";
import { authOptions } from "./src/auth.ts";

export const auth = betterAuth(
  authOptions({
    env: {
      NODE_ENV: "development",
      PORT: 3001,
      APP_URL: "http://localhost:3000",
      DATABASE_URL: "postgres://unused",
      AUTH_SECRET: "only-for-schema-generation-not-a-real-secret",
      MAIL_TRANSPORT: "log",
      MAIL_FROM: "EnerEdge <no-reply@eneredge.tech>",
      PLATFORM_ADMIN_EMAILS: [],
      SIGNUP_MODE: "open",
    },
    mailer: { async send() {} },
  }),
);
