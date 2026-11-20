"use client";

import type { Me } from "@eneredge/api";
import { useRouter } from "next/navigation";
import { createContext, type ReactNode, use, useEffect } from "react";
import { AuthCard, AuthFrame } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { hu } from "@/i18n/hu";
import { withNext } from "@/lib/navigation";
import { useMe } from "@/lib/session";

const CurrentUserContext = createContext<Me | null>(null);

/**
 * Shows its children only to a signed-in user. Anyone else is sent to sign-in and
 * brought back to this address afterwards. This is a convenience of the interface:
 * what a user may see or do is decided by the API on every request.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const me = useMe();
  // While the answer is being fetched again, an earlier "nobody" proves nothing.
  const isSignedOut = me.isSuccess && me.data === null && !me.isFetching;

  useEffect(() => {
    if (!isSignedOut) return;
    const currentAddress = `${window.location.pathname}${window.location.search}`;
    router.replace(withNext("/sign-in", currentAddress));
  }, [isSignedOut, router]);

  if (me.isError) {
    return (
      <AuthFrame>
        <AuthCard title={hu.errors.internal}>
          <Button variant="secondary" onClick={() => me.refetch()}>
            {hu.common.retry}
          </Button>
        </AuthCard>
      </AuthFrame>
    );
  }
  // Still loading, or on the way to sign-in: nothing to show yet.
  if (!me.data) return null;

  return <CurrentUserContext value={me.data}>{children}</CurrentUserContext>;
}

/** The signed-in user, for anything rendered inside `RequireAuth`. */
export function useCurrentUser(): Me {
  const me = use(CurrentUserContext);
  if (!me) throw new Error("useCurrentUser must be used inside <RequireAuth>.");
  return me;
}
