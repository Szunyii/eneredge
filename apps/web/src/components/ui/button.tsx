import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

// shadcn/ui button, restyled to the brand: pill shape, the sun-yellow main action,
// and the press feedback and focus ring from globals.css instead of a ring utility.
const buttonVariants = cva(
  "press inline-flex shrink-0 select-none items-center justify-center gap-2 rounded-full font-semibold tracking-[-0.012em] whitespace-nowrap disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-sun text-ink hover:bg-[color-mix(in_oklab,var(--color-sun)_86%,var(--color-ink))]",
        secondary: "bg-ink/8 text-ink hover:bg-ink/14",
        outline: "border border-line bg-sheet text-ink hover:bg-alu",
        ghost: "text-ink-soft hover:bg-ink/6 hover:text-ink",
        destructive:
          "bg-deviation-ink text-white hover:bg-[color-mix(in_oklab,var(--color-deviation-ink)_88%,black)]",
        link: "rounded-md text-ink underline decoration-line underline-offset-4 hover:decoration-ink",
      },
      size: {
        default: "h-11 px-5 text-[0.9375rem]",
        sm: "h-9 px-3.5 text-sm",
        lg: "h-12 px-7 text-base",
        icon: "size-11",
        "icon-sm": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
