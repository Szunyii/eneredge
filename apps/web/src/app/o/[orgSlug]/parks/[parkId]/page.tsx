"use client";

import type { ParkDto } from "@eneredge/api";
import { ChevronLeftIcon } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { LoadError } from "@/components/load-error";
import { type CurrentOrganization, useCurrentOrganization } from "@/components/organization-gate";
import { PageHeader } from "@/components/page-header";
import { ParkForm } from "@/components/park-form";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { hu } from "@/i18n/hu";
import { formatDate, formatDecimal } from "@/lib/format";
import { useDeletePark, usePark, useUpdatePark } from "@/lib/parks";

export default function ParkPage() {
  const { parkId } = useParams<{ parkId: string }>();
  const organization = useCurrentOrganization();
  const park = usePark(organization.slug, parkId);

  if (park.isPending) return null;
  if (park.isError) return <LoadError onRetry={() => park.refetch()} />;
  if (park.data === null) return <p className="type-lead">{hu.errors.not_found}</p>;

  return <ParkDetails park={park.data} organization={organization} />;
}

function ParkDetails({ park, organization }: { park: ParkDto; organization: CurrentOrganization }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const updatePark = useUpdatePark(organization.slug, park.id);
  const deletePark = useDeletePark(organization.slug);
  const parksHref = `/o/${organization.slug}/parks`;

  async function removePark() {
    try {
      await deletePark.mutateAsync(park.id);
      toast.success(hu.park.deleted(park.name));
      router.replace(parksHref);
    } catch {
      toast.error(hu.errors.internal);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={parksHref}
        className="-ml-1 mb-4 inline-flex h-8 items-center gap-1 rounded-md pr-2 text-ink-soft text-sm transition-colors duration-200 hover:text-ink"
      >
        <ChevronLeftIcon aria-hidden="true" className="size-4" />
        {hu.parks.title}
      </Link>
      <PageHeader
        title={park.name}
        actions={
          organization.canManage && !isEditing ? (
            <>
              <Button variant="secondary" onClick={() => setIsEditing(true)}>
                {hu.park.edit}
              </Button>
              <ConfirmDialog
                trigger={<Button variant="ghost">{hu.park.delete}</Button>}
                title={hu.park.deleteQuestion}
                description={hu.park.deleteWarning(park.name)}
                confirmLabel={hu.park.confirmDelete}
                cancelLabel={hu.park.keep}
                onConfirm={removePark}
              />
            </>
          ) : null
        }
      />
      <SectionCard title={hu.park.details}>
        {isEditing ? (
          <ParkForm
            park={park}
            submitLabel={hu.park.save}
            onSave={async (values) => {
              await updatePark.mutateAsync(values);
              toast.success(hu.park.saved);
              setIsEditing(false);
            }}
            secondaryAction={
              <Button variant="ghost" onClick={() => setIsEditing(false)}>
                {hu.common.cancel}
              </Button>
            }
          />
        ) : (
          <ParkFacts park={park} />
        )}
      </SectionCard>
    </div>
  );
}

function ParkFacts({ park }: { park: ParkDto }) {
  const facts = [
    { term: hu.park.status, detail: <StatusBadge status={park.status} /> },
    {
      term: hu.park.location,
      detail: `${formatDecimal(park.latitude)}; ${formatDecimal(park.longitude)}`,
    },
    { term: hu.park.timezone, detail: park.timezone.replaceAll("_", " ") },
    { term: hu.park.pollInterval, detail: hu.park.seconds(park.fastIntervalS) },
    { term: hu.park.addedOn, detail: formatDate(park.createdAt, park.timezone) },
  ];

  return (
    <dl className="grid grid-cols-[minmax(8rem,auto)_1fr] items-center gap-x-6 gap-y-4">
      {facts.map((fact) => (
        <div key={fact.term} className="contents">
          <dt className="text-ink-muted">{fact.term}</dt>
          <dd className="font-medium">{fact.detail}</dd>
        </div>
      ))}
    </dl>
  );
}
