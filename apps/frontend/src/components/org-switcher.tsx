"use client";

import type { Me } from "@eneredge/backend";
import { ChevronsUpDownIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type OrgSwitcherProps = {
  organizations: Me["organizations"];
  currentSlug: string | undefined;
};

/**
 * Says which company's pages are open. With more than one company it is also the
 * way to the others; with one, it is just the name.
 */
export function OrgSwitcher({ organizations, currentSlug }: OrgSwitcherProps) {
  const current = organizations.find((organization) => organization.slug === currentSlug);
  if (!current) return null;

  if (organizations.length === 1) {
    return <span className="truncate font-medium text-ink-soft text-sm">{current.name}</span>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="min-w-0 max-w-56">
          <span className="truncate">{current.name}</span>
          <ChevronsUpDownIcon aria-hidden="true" className="text-ink-muted" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        {organizations.map((organization) => (
          <DropdownMenuItem key={organization.id} asChild>
            <Link
              href={`/o/${organization.slug}/parks`}
              aria-current={organization.slug === currentSlug ? "true" : undefined}
              className="aria-[current=true]:font-semibold"
            >
              {organization.name}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
