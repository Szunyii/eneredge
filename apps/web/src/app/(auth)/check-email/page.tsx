"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthCard } from "@/components/auth-layout";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Unbroken } from "@/components/unbroken";
import { hu } from "@/i18n/hu";
import { authClient } from "@/lib/auth-client";
import { safeNextPath } from "@/lib/navigation";

export default function CheckEmailPage() {
  // useSearchParams needs a Suspense boundary above it.
  return (
    <Suspense>
      <CheckEmail />
    </Suspense>
  );
}

/** Where sign-up ends: the rest happens through the link in the mail. */
function CheckEmail() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const nextPath = safeNextPath(searchParams.get("next"));
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");

  async function resend() {
    if (!email) return;
    setResendState("sending");
    await authClient.sendVerificationEmail({ email, callbackURL: nextPath ?? "/" });
    // The same answer whether or not the address has an account waiting.
    setResendState("sent");
  }

  return (
    <AuthCard
      title={hu.auth.checkEmailTitle}
      lead={
        <>
          {email ? (
            <>
              {hu.auth.checkEmailSentTo} <Unbroken>{email}</Unbroken>
            </>
          ) : (
            hu.auth.checkEmailSent
          )}{" "}
          {hu.auth.checkEmailWhatNext}
        </>
      }
    >
      {email ? (
        <div className="flex flex-col gap-4">
          {resendState === "sent" ? (
            <FormMessage tone="notice">{hu.auth.resent}</FormMessage>
          ) : null}
          <Button
            variant="secondary"
            onClick={resend}
            disabled={resendState !== "idle"}
            aria-busy={resendState === "sending"}
          >
            {hu.auth.resend}
          </Button>
        </div>
      ) : null}
    </AuthCard>
  );
}
