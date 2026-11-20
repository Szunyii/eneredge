"use client";

import { cn } from "cn";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AccountMenu } from "@/components/account-menu";
import { Logo } from "@/components/logo";
import { OrgSwitcher } from "@/components/org-switcher";
import { useCurrentUser } from "@/components/require-auth";
import { hu } from "@/i18n/hu";

type AppShellProps = {
  /** The company whose pages are shown; its sections make up the navigation. */
  organizationSlug: string | undefined;
  children: ReactNode;
};

/** The frame around every page of the app: brand, navigation, company, account, content. */
export function AppShell({ organizationSlug, children }: AppShellProps) {
  const me = useCurrentUser();
  const pathname = usePathname();

  const sections = organizationSlug
    ? [
        { href: `/o/${organizationSlug}/parks`, label: hu.nav.parks },
        { href: `/o/${organizationSlug}/alerts`, label: hu.nav.alerts },
        { href: `/o/${organizationSlug}/settings`, label: hu.nav.settings },
      ]
    : [];
  if (me.user.isPlatformAdmin) sections.push({ href: "/admin", label: hu.nav.admin });

  const homeHref = organizationSlug ? `/o/${organizationSlug}/parks` : "/";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-line border-b bg-alu/90 backdrop-blur-md">
        {/* On a narrow screen the navigation wraps onto a second row under the brand. */}
        <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center gap-x-6 px-5 sm:px-8">
          <Link
            href={homeHref}
            aria-label={hu.nav.home}
            className="press flex h-14 items-center rounded-lg"
          >
            <Logo compact />
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
          <div className="ml-auto flex min-w-0 items-center gap-3">
            <OrgSwitcher organizations={me.organizations} currentSlug={organizationSlug} />
            <AccountMenu user={me.user} />
          </div>
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
