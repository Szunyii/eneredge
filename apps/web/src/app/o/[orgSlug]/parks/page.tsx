"use client";

import type { ParkDto } from "@eneredge/api";
import Link from "next/link";
import { LoadError } from "@/components/load-error";
import { useCurrentOrganization } from "@/components/organization-gate";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { hu } from "@/i18n/hu";
import { useParks } from "@/lib/parks";

export default function ParksPage() {
  const organization = useCurrentOrganization();
  const parks = useParks(organization.slug);
  const newParkHref = `/o/${organization.slug}/parks/new`;

  return (
    <>
      <PageHeader
        title={hu.parks.title}
        actions={
          organization.canManage ? (
            <Button asChild>
              <Link href={newParkHref}>{hu.parks.new}</Link>
            </Button>
          ) : null
        }
      />
      {parks.isError ? <LoadError onRetry={() => parks.refetch()} /> : null}
      {parks.data?.length === 0 ? <NoParksYet canManage={organization.canManage} /> : null}
      {parks.data && parks.data.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {parks.data.map((park) => (
            <li key={park.id}>
              <ParkCard park={park} href={`/o/${organization.slug}/parks/${park.id}`} />
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

/**
 * A park in the list. Power, energy and alerts will join the name and the status
 * once there is data behind them; until then the card shows nothing it does not know.
 *
 * The link is the park's name alone — that is what a screen reader announces —
 * but it is stretched over the whole card, so the card is one large target.
 */
function ParkCard({ park, href }: { park: ParkDto; href: string }) {
  return (
    <article className="relative flex h-full min-h-28 flex-col items-start justify-between gap-4 rounded-2xl border border-line bg-sheet p-5 transition-[border-color,transform] duration-200 ease-out hover:border-ink/40 has-[a:active]:scale-[0.99] has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-ink has-[a:focus-visible]:outline-offset-2">
      <h2 className="type-heading break-words">
        <Link href={href} className="outline-none after:absolute after:inset-0 after:rounded-2xl">
          {park.name}
        </Link>
      </h2>
      <StatusBadge status={park.status} />
    </article>
  );
}

function NoParksYet({ canManage }: { canManage: boolean }) {
  return (
    <div className="rounded-2xl border border-line border-dashed px-6 py-12 text-center">
      <p className="type-heading">{hu.parks.empty}</p>
      <p className="mt-2 text-ink-soft">
        {canManage ? hu.parks.emptyHintForManagers : hu.parks.emptyHintForMembers}
      </p>
    </div>
  );
}
