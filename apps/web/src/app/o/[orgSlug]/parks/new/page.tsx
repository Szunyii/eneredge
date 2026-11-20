"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { NoAccess } from "@/components/no-access";
import { useCurrentOrganization } from "@/components/organization-gate";
import { PageHeader } from "@/components/page-header";
import { ParkForm } from "@/components/park-form";
import { Button } from "@/components/ui/button";
import { hu } from "@/i18n/hu";
import { useCreatePark } from "@/lib/parks";

export default function NewParkPage() {
  const router = useRouter();
  const organization = useCurrentOrganization();
  const createPark = useCreatePark(organization.slug);
  const parksHref = `/o/${organization.slug}/parks`;

  // Members only read; the API would refuse them anyway.
  if (!organization.canManage) return <NoAccess />;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={hu.park.newTitle} lead={hu.park.newLead} />
      <div className="rounded-2xl border border-line bg-sheet p-6 sm:p-8">
        <ParkForm
          submitLabel={hu.park.create}
          onSubmit={async (values) => {
            const park = await createPark.mutateAsync(values);
            router.push(`${parksHref}/${park.id}`);
          }}
          secondaryAction={
            <Button asChild variant="ghost">
              <Link href={parksHref}>{hu.common.cancel}</Link>
            </Button>
          }
        />
      </div>
    </div>
  );
}
