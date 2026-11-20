"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useMe } from "@/lib/session";

export default function HomePage() {
  // useSearchParams needs a Suspense boundary above it.
  return (
    <Suspense>
      <SendOnward />
    </Suspense>
  );
}

/**
 * The bare address has no page of its own: it sends everyone where they belong.
 * Signed out → sign-in · no company yet → onboarding · otherwise → the first company's parks.
 */
function SendOnward() {
  const router = useRouter();
  const me = useMe();
  // The confirmation link of the sign-up mail lands here, with ?error=… when it no longer works.
  const verificationFailed = useSearchParams().has("error");

  useEffect(() => {
    if (!me.isSuccess) return;
    const firstCompany = me.data?.organizations[0];

    if (me.data === null) {
      router.replace(verificationFailed ? "/sign-in?verification=failed" : "/sign-in");
    } else if (!firstCompany) {
      router.replace("/onboarding");
    } else {
      router.replace(`/o/${firstCompany.slug}/parks`);
    }
  }, [me.isSuccess, me.data, verificationFailed, router]);

  return null;
}
