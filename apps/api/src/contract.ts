// What the web app may know about the API: types only. This is the one module
// `@eneredge/api` exports, so no backend code can end up in the browser bundle.
export type { AppType } from "./app.ts";
export type { ApiErrorBody, ApiErrorCode, FieldErrorCode } from "./errors.ts";
export type { Me } from "./routes/me.ts";

export type ParkStatus = "draft" | "connecting" | "online" | "degraded" | "offline";
