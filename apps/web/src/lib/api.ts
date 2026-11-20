import type { AppType } from "@eneredge/api";
import { hc } from "hono/client";

/**
 * Typed client for the backend. Requests go to this app's own origin under /api,
 * and src/proxy.ts hands them to the API process — the browser never needs its address.
 */
export const api = hc<AppType>("/").api;
