"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useMe } from "@/lib/session";

/**
 * The bare address has no page of its own: it sends everyone where they belong.
 * Signed out → sign-in · no company yet → onboarding · otherwise → the first company's parks.
 */
export default function HomePage() {
  const router = useRouter();
  const me = useMe();

  useEffect(() => {
    if (!me.isSuccess) return;
    const firstCompany = me.data?.organizations[0];

    if (me.data === null) {
      router.replace("/sign-in");
    } else if (!firstCompany) {
      router.replace("/onboarding");
    } else {
      router.replace(`/o/${firstCompany.slug}/parks`);
    }
  }, [me.isSuccess, me.data, router]);

  return null;
}
