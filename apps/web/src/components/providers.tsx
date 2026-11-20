"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { Toaster } from "@/components/ui/sonner";

/** What every page needs around it: the cache of server data, and a place for confirmations. */
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

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Short confirmations of what just happened ("the park was saved"). */}
      <Toaster position="bottom-center" />
    </QueryClientProvider>
  );
}
