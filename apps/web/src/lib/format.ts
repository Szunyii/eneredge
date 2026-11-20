/** A day, written the Hungarian way ("2026. nov. 20."), in the given time zone when one is named. */
export function formatDate(isoDate: string | Date, timeZone?: string): string {
  return new Intl.DateTimeFormat("hu-HU", { dateStyle: "medium", timeZone }).format(
    new Date(isoDate),
  );
}

/** A number for reading: with a decimal comma, rounded to at most six decimals. */
export function formatDecimal(value: number): string {
  return value.toLocaleString("hu-HU", { maximumFractionDigits: 6, useGrouping: false });
}
