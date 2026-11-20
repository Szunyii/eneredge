// A company's slug is part of every address of its pages (/o/<slug>/parks):
// lower-case letters and digits, single hyphens between them, 3 to 40 characters.
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MIN_LENGTH = 3;
const MAX_LENGTH = 40;

export function isValidOrganizationSlug(slug: string): boolean {
  return slug.length >= MIN_LENGTH && slug.length <= MAX_LENGTH && SLUG_PATTERN.test(slug);
}
