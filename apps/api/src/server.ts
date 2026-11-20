import { type AppDeps, createApp } from "./app.ts";

/** Starts the HTTP server. `PORT=0` picks a free port (tests). */
export function startServer(deps: AppDeps): Bun.Server<undefined> {
  const app = createApp(deps);
  return Bun.serve({
    port: deps.env.PORT,
    routes: {
      "/api/*": (request) => app.fetch(request),
    },
    fetch: () => new Response("Not found", { status: 404 }),
  });
}
