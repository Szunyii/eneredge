import * as React from "react"
import { cn } from "cn"

// shadcn/ui input, restyled to the brand. The text is 16px on phones so that
// iOS does not zoom the page when the field gets focus.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-xl border border-line bg-sheet px-3.5 text-base text-ink outline-none transition-[border-color,box-shadow] duration-150 selection:bg-sun selection:text-ink placeholder:text-faint disabled:pointer-events-none disabled:opacity-50 md:text-[0.9375rem]",
        "focus-visible:border-ink focus-visible:ring-[3px] focus-visible:ring-ink/12",
        "aria-invalid:border-deviation-ink aria-invalid:focus-visible:ring-deviation/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
