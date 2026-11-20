import type { ReactNode } from "react";

/**
 * A piece of text that reads as one unit — an e-mail address, an address of a
 * page. It moves to the next line as a whole, and only breaks inside when it is
 * longer than a full line.
 */
export function Unbroken({ children }: { children: ReactNode }) {
  return <span className="inline-block max-w-full break-all font-medium text-ink">{children}</span>;
}
