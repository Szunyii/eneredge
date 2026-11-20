import { type AppDeps, createApp } from "./app.ts";

/**
 * Starts the API server. `PORT=0` picks a free port (tests).
 * Every path goes to the app, so anything unknown is answered as JSON.
 */
export function startServer(deps: AppDeps): Bun.Server<undefined> {
  const app = createApp(deps);
  return Bun.serve({
    port: deps.env.PORT,
    fetch: (request) => app.fetch(request),
  });
}
