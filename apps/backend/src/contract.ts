// What the web app may know about the API: types only. This is the one module
// `@eneredge/backend` exports, so no backend code can end up in the browser bundle.
export type { AppType } from "./app.ts";
export type { ApiErrorBody, ApiErrorCode, FieldErrorCode } from "./errors.ts";
export type { PublicConfig } from "./routes/config.ts";
export type { Me } from "./routes/me.ts";

export type { ParkDto } from "./routes/parks.ts";

import type { ParkDto } from "./routes/parks.ts";

/** draft · connecting · online · degraded · offline — the states a park can be in. */
export type ParkStatus = ParkDto["status"];
