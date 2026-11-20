// Run as its own process by process-guard.test.ts: a promise is rejected and
// nobody handles it. With the guard on, the process must live to print the last line.
import { logUnhandledRejections } from "../../src/process-guard.ts";

logUnhandledRejections();
void Promise.reject(new Error("nobody caught this"));
await Bun.sleep(50);
console.log("still running");
