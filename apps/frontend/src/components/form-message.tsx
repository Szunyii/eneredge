import { cn } from "cn";
import type { ReactNode } from "react";

type FormMessageProps = {
  /** `error`: something went wrong and needs attention. `notice`: just so you know. */
  tone: "error" | "notice";
  children: ReactNode;
};

/** A message about the form as a whole, above its button. */
export function FormMessage({ tone, children }: FormMessageProps) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-xl px-3.5 py-3 text-sm transition-opacity duration-150 starting:opacity-0",
        tone === "error" ? "bg-deviation-soft text-deviation-ink" : "bg-ink/6 text-ink",
      )}
    >
      {children}
    </p>
  );
}
