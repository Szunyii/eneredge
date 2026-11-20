/**
 * By default a rejected promise that nobody handles ends the process. For a
 * server that is the wrong trade: one bug in one request would take the API
 * down for every company. Log it loudly and keep serving.
 */
export function logUnhandledRejections(): void {
  // Under `bun --hot` the entry point runs again on every reload; one listener is enough.
  if (process.listenerCount("unhandledRejection") > 0) return;

  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled promise rejection:", reason);
  });
}
