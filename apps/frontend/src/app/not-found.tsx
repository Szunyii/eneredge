import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { hu } from "@/i18n/hu";

export const metadata: Metadata = { title: hu.notFound.title };

/** Shown for every address the app does not know, with a 404 status. */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-start justify-center gap-5 px-5 py-12">
      <Logo />
      <h1 className="type-title">{hu.notFound.title}</h1>
      <p className="type-lead">{hu.notFound.body}</p>
      <Button asChild variant="secondary">
        <Link href="/">{hu.notFound.home}</Link>
      </Button>
    </main>
  );
}
