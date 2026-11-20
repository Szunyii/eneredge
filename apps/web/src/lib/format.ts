/** A day, written the Hungarian way ("2026. nov. 20."), in the given time zone when one is named. */
export function formatDate(isoDate: string | Date, timeZone?: string): string {
  return new Intl.DateTimeFormat("hu-HU", { dateStyle: "medium", timeZone }).format(
    new Date(isoDate),
  );
}
