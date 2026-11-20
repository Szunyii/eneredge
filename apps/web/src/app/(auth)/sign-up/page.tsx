import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { hu } from "@/i18n/hu";

export const metadata: Metadata = { title: hu.auth.signUpTitle };

// Placeholder: the form arrives with the authentication screens.
export default function SignUpPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-5 py-12">
      <Logo />
      <h1 className="type-title">{hu.auth.signUpTitle}</h1>
    </main>
  );
}
