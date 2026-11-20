const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Whether a text has the shape of a UUID — asked before it goes into a uuid column. */
export function isUuid(text: string): boolean {
  return UUID_PATTERN.test(text);
}
