import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/**
 * Sign-up, sign-in, companies, members and invitations. Talks to /api/auth on
 * this app's own origin, like every other request to the backend.
 */
export const authClient = createAuthClient({
  plugins: [organizationClient()],
});
