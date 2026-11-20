"use client";

import { cn } from "cn";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { hu } from "@/i18n/hu";

type AppShellProps = {
  /** The company whose pages are shown; it is part of every link. */
  orgSlug: string;
  children: ReactNode;
};

/** The frame around every page of a company: brand, main navigation, content. */
export function AppShell({ orgSlug, children }: AppShellProps) {
  const pathname = usePathname();
  const sections = [
    { href: `/o/${orgSlug}/parks`, label: hu.nav.parks },
    { href: `/o/${orgSlug}/alerts`, label: hu.nav.alerts },
    { href: `/o/${orgSlug}/settings`, label: hu.nav.settings },
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-line border-b bg-alu/90 backdrop-blur-md">
        {/* On a narrow screen the navigation wraps onto a second row under the brand. */}
        <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center gap-x-6 px-5 sm:px-8">
          <Link
            href={`/o/${orgSlug}/parks`}
            aria-label={hu.nav.home}
            className="press flex h-14 items-center rounded-lg"
          >
            <Logo />
          </Link>
          <nav aria-label={hu.nav.main} className="max-md:order-last max-md:w-full max-md:pb-2">
            <ul className="-mx-2 flex items-center gap-1 overflow-x-auto px-2">
              {sections.map((section) => (
                <li key={section.href}>
                  <SectionLink
                    href={section.href}
                    isCurrent={pathname === section.href || pathname.startsWith(`${section.href}/`)}
                  >
                    {section.label}
                  </SectionLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-5 py-8 sm:px-8">{children}</main>
    </div>
  );
}

function SectionLink({
  href,
  isCurrent,
  children,
}: {
  href: string;
  isCurrent: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={isCurrent ? "page" : undefined}
      className={cn(
        "press inline-flex h-9 items-center rounded-full px-3.5 text-[0.9375rem]",
        isCurrent
          ? "bg-ink/8 font-semibold text-ink"
          : "text-ink-soft hover:bg-ink/6 hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}
