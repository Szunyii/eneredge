"use client";

import { useState } from "react";
import { AuthCard } from "@/components/auth-layout";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Unbroken } from "@/components/unbroken";
import { hu } from "@/i18n/hu";
import { type AccountRequest, requestAccount } from "@/lib/account";
import { usePublicConfig } from "@/lib/config";

/** Where asking for an account ends: the rest happens through the link in the mail. */
export function CheckEmailCard({ request }: { request: AccountRequest }) {
  const isByInvitation = usePublicConfig().data?.signupMode === "allowlist";
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  async function resend() {
    setResendState("sending");
    try {
      await requestAccount(request);
      setResendState("sent");
    } catch {
      setResendState("failed");
    }
  }

  return (
    <AuthCard
      title={hu.auth.checkEmailTitle}
      lead={
        <>
          {/* By invitation, not every address gets a mail — and we do not say which. */}
          {isByInvitation ? hu.auth.checkEmailIfAllowed : hu.auth.checkEmailSentTo}{" "}
          <Unbroken>{request.email}</Unbroken>. {hu.auth.checkEmailWhatNext}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {resendState === "sent" ? <FormMessage tone="notice">{hu.auth.resent}</FormMessage> : null}
        {resendState === "failed" ? (
          <FormMessage tone="error">{hu.errors.internal}</FormMessage>
        ) : null}
        <Button
          variant="secondary"
          onClick={resend}
          disabled={resendState === "sending" || resendState === "sent"}
          aria-busy={resendState === "sending"}
        >
          {hu.auth.resend}
        </Button>
      </div>
    </AuthCard>
  );
}
