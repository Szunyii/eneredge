import { type NextRequest, NextResponse } from "next/server";

/**
 * The browser only ever talks to this app. Requests under /api are handed to the
 * backend, which is a separate process (apps/backend). The address is fixed by
 * API_ORIGIN and read when the request arrives, so one build serves any environment.
 */
export function proxy(request: NextRequest) {
  const apiOrigin = process.env.API_ORIGIN ?? "http://localhost:3001";
  const { pathname, search } = request.nextUrl;
  return NextResponse.rewrite(new URL(`${pathname}${search}`, apiOrigin));
}

export const config = {
  matcher: "/api/:path*",
};
