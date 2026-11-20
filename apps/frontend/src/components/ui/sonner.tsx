"use client"

import { CircleCheckIcon, OctagonXIcon } from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

// shadcn/ui toaster in the brand's colours (one light theme, so no theme lookup).
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
      }}
      style={
        {
          "--normal-bg": "var(--color-ink)",
          "--normal-text": "var(--color-sheet)",
          "--normal-border": "var(--color-ink)",
          "--border-radius": "0.875rem",
          // The toast speaks in the app's own typeface, not the library's default.
          fontFamily: "inherit",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
