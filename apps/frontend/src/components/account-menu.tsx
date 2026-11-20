"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { hu } from "@/i18n/hu";
import { authClient } from "@/lib/auth-client";

/** Who is signed in, and the way out. */
export function AccountMenu({ user }: { user: { name: string; email: string } }) {
  async function signOut() {
    await authClient.signOut();
    // A full page load, so nothing of this user stays in memory for the next one.
    window.location.assign("/sign-in");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="icon-sm" aria-label={hu.nav.account}>
          <span aria-hidden="true" className="font-semibold text-[0.8125rem]">
            {initialsOf(user.name)}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="font-semibold text-ink">{user.name}</span>
          <span className="break-all font-normal text-ink-muted text-sm">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut}>{hu.common.signOut}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** "Teszt Elek" → "TE"; a single name gives one letter. */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? (words.at(-1)?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}
