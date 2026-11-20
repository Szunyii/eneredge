import type { ReactNode } from "react";
import { Logo } from "@/components/logo";

/** The page frame of everything outside the app proper: a narrow column under the brand. */
export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[27rem] flex-col justify-center px-5 py-10">
      <Logo className="mb-8 self-start" />
      {children}
    </main>
  );
}

type AuthCardProps = {
  title: string;
  /** One or two sentences under the title that say what happens here. */
  lead?: ReactNode;
  children?: ReactNode;
  /** A line under the card, usually the way to a neighbouring page. */
  footer?: ReactNode;
};

/** The card inside the frame: one task, with its title. */
export function AuthCard({ title, lead, children, footer }: AuthCardProps) {
  return (
    <>
      <section className="rounded-2xl border border-line bg-sheet p-6 sm:p-8">
        <h1 className="type-title">{title}</h1>
        {lead ? <p className="mt-2.5 text-ink-soft">{lead}</p> : null}
        {children ? <div className="mt-6">{children}</div> : null}
      </section>
      {footer ? <p className="mt-5 text-center text-ink-muted text-sm">{footer}</p> : null}
    </>
  );
}

/** A link inside running text: underlined, so it is found without colour. */
export const textLinkClass =
  "rounded-sm font-medium text-ink underline decoration-line underline-offset-4 transition-colors duration-200 hover:decoration-ink";
