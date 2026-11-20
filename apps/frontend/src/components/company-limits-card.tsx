"use client";

import { toast } from "sonner";
import { z } from "zod";
import { showRefusal } from "@/components/form/show-refusal";
import { useAppForm } from "@/components/form/use-app-form";
import { LoadError } from "@/components/load-error";
import { SectionCard } from "@/components/section-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { hu } from "@/i18n/hu";
import { useCompanies, useSetParkLimit } from "@/lib/admin";
import { refusalFrom } from "@/lib/api-error";

type Company = { id: string; name: string; slug: string; parkCount: number; parkLimit: number };

/** Every company with how many parks it has and how many it may have. */
export function CompanyLimitsCard() {
  const companies = useCompanies();

  return (
    <SectionCard title={hu.admin.companiesTitle} lead={hu.admin.companiesLead}>
      {companies.isError ? <LoadError onRetry={() => companies.refetch()} /> : null}
      {companies.data ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{hu.admin.company}</TableHead>
              <TableHead className="text-right">{hu.admin.parkCount}</TableHead>
              <TableHead>{hu.admin.parkLimit}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.data.map((company) => (
              <TableRow key={company.id}>
                <TableCell>
                  <div className="font-medium">{company.name}</div>
                  <div className="text-ink-muted">/o/{company.slug}</div>
                </TableCell>
                <TableCell className="text-right">{company.parkCount}</TableCell>
                <TableCell>
                  <ParkLimitForm company={company} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </SectionCard>
  );
}

const parkLimitSchema = z.object({
  parkLimit: z.string().refine((text) => {
    const limit = Number(text);
    return Number.isInteger(limit) && limit >= 1 && limit <= 1000;
  }, hu.admin.limitInvalid),
});

/** One company's limit, editable in place. */
function ParkLimitForm({ company }: { company: Company }) {
  const setParkLimit = useSetParkLimit();

  const form = useAppForm({
    defaultValues: { parkLimit: String(company.parkLimit) },
    validators: { onSubmit: parkLimitSchema },
    onSubmit: async ({ value, formApi }) => {
      try {
        await setParkLimit.mutateAsync({
          organizationId: company.id,
          parkLimit: Number(value.parkLimit),
        });
        toast.success(hu.admin.limitSaved);
      } catch (error) {
        showRefusal(formApi, refusalFrom(error));
      }
    },
  });

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
      className="flex items-start gap-2"
    >
      <div className="w-24">
        <form.AppField name="parkLimit">
          {(field) => (
            <field.TextField
              label={hu.admin.parkLimitOf(company.name)}
              hideLabel
              inputMode="numeric"
              autoComplete="off"
            />
          )}
        </form.AppField>
      </div>
      <form.AppForm>
        <form.SubmitButton variant="secondary" aria-label={hu.admin.saveLimitOf(company.name)}>
          {hu.common.save}
        </form.SubmitButton>
      </form.AppForm>
    </form>
  );
}
