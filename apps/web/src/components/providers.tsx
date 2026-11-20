"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";

/** What every page needs around it: the cache of server data. */
export function Providers({ children }: { children: ReactNode }) {
  // One client per browser tab, created once.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // A refused request (not signed in, not found) will not succeed on a second try.
            retry: false,
            staleTime: 15_000,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
