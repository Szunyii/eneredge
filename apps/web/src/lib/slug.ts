const MAX_LENGTH = 40;

/**
 * Turns a company's name into the identifier used in addresses (/o/<slug>):
 * accents dropped, lower case, everything that is not a letter or digit becomes
 * a single hyphen, at most 40 characters. "Ős-Zöld Erőmű Kft." → "os-zold-eromu-kft".
 */
export function slugify(name: string): string {
  return (
    name
      // Split accented letters into letter + accent, then drop the accents.
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, MAX_LENGTH)
      // The cut may have landed right after a hyphen.
      .replace(/-+$/, "")
  );
}
