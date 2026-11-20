import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { hu } from "@/i18n/hu";

export const metadata: Metadata = { title: hu.alerts.title };

/** Alerts arrive with the data; until then the page says what will be here. */
export default function AlertsPage() {
  return (
    <>
      <PageHeader title={hu.alerts.title} />
      <div className="rounded-2xl border border-line border-dashed px-6 py-12 text-center">
        <p className="type-heading">{hu.alerts.empty}</p>
        <p className="mx-auto mt-2 max-w-md text-ink-soft">{hu.alerts.emptyHint}</p>
      </div>
    </>
  );
}
