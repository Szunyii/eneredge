import Link from "next/link";
import { AuthCard, AuthFrame } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { hu } from "@/i18n/hu";

/**
 * For an address under a company the user does not belong to — or one that does
 * not exist: the two look the same on purpose.
 */
export function NoAccess() {
  return (
    <AuthFrame>
      <AuthCard title={hu.errors.not_found}>
        <Button asChild variant="secondary">
          <Link href="/">{hu.notFound.home}</Link>
        </Button>
      </AuthCard>
    </AuthFrame>
  );
}
