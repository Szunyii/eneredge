"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard, AuthFrame } from "@/components/auth-layout";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { hu } from "@/i18n/hu";
import { authClient } from "@/lib/auth-client";
import { withNext } from "@/lib/navigation";
import { refreshSession, useMe } from "@/lib/session";

/** The page the link in an invitation mail opens. */
export default function AcceptInvitationPage() {
  const { id: invitationId } = useParams<{ id: string }>();
  const me = useMe();

  if (!me.isSuccess) return null;
  return (
    <AuthFrame>
      {me.data ? (
        <InvitationForSignedIn invitationId={invitationId} />
      ) : (
        <InvitationForSignedOut invitationId={invitationId} />
      )}
    </AuthFrame>
  );
}

/** Whose invitation this is cannot be told to a stranger: first an account, then the details. */
function InvitationForSignedOut({ invitationId }: { invitationId: string }) {
  const thisPage = `/accept-invitation/${invitationId}`;
  return (
    <AuthCard title={hu.invitation.title} lead={hu.invitation.signedOutLead}>
      <div className="flex flex-col gap-3">
        <Button asChild>
          <Link href={withNext("/sign-up", thisPage)}>{hu.invitation.signUp}</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href={withNext("/sign-in", thisPage)}>{hu.invitation.signIn}</Link>
        </Button>
      </div>
    </AuthCard>
  );
}

function InvitationForSignedIn({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptFailed, setAcceptFailed] = useState(false);

  const invitation = useQuery({
    queryKey: ["invitation", invitationId],
    queryFn: async () => {
      const result = await authClient.organization.getInvitation({ query: { id: invitationId } });
      if (result.error) throw new Error(result.error.code ?? "invitation unavailable");
      return result.data;
    },
  });

  async function accept() {
    if (!invitation.data) return;
    setIsAccepting(true);
    const result = await authClient.organization.acceptInvitation({ invitationId });
    if (result.error) {
      setAcceptFailed(true);
      setIsAccepting(false);
      return;
    }
    await refreshSession(queryClient);
    router.replace(`/o/${invitation.data.organizationSlug}/parks`);
  }

  if (invitation.isPending) return null;

  if (invitation.isError || acceptFailed) {
    return (
      <AuthCard title={hu.invitation.title}>
        <div className="flex flex-col gap-4">
          <FormMessage tone="error">{hu.invitation.invalid}</FormMessage>
          <Button asChild variant="secondary">
            <Link href="/">{hu.invitation.goHome}</Link>
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={hu.invitation.title}
      lead={hu.invitation.lead(invitation.data.inviterEmail, invitation.data.organizationName)}
    >
      <Button onClick={accept} disabled={isAccepting} aria-busy={isAccepting} className="w-full">
        {hu.invitation.accept}
      </Button>
    </AuthCard>
  );
}
